#!/usr/bin/env python3
"""I53: actual X11 library connect/disconnect, saved TeX, XeLaTeX PDF and Undo."""
import argparse, hashlib, json, os, platform, subprocess, time
from pathlib import Path
SRC = "\n".join([
 r"\documentclass{standalone}",
 r"\usepackage{fontspec}",
 r"\setmainfont{DejaVu Serif}",
 r"\usepackage{tikz}",
 r"% Preserve unknown macro, original source and Cyrillic",
 r"\begin{document}",
 r"\newcommand{\OpaqueLabel}{Не менять}",
 r"\begin{tikzpicture}",
 r"  \node at (0,0) {\OpaqueLabel};",
 r"\end{tikzpicture}",
 r"\end{document}", ""
]).encode()
DECL=b"\\usetikzlibrary{positioning}\n"
def sha(b): return hashlib.sha256(b).hexdigest()
def exact_patch(old,new):
 return new.count(DECL)==1 and new.replace(DECL,b"",1)==old
def check_profile(p,tree):
 if not tree or p.get("tree")!=tree: raise ValueError("Not a verified production app tree")
 for n in ("source","path","save","build","export","panel","library","connect","disconnect","undo"):
  x=p.get(n)
  if not isinstance(x,list) or len(x)!=2 or any(type(v)!=int or v<0 for v in x):
   raise ValueError("Unreviewed X11 target "+n)
def command(*args,timeout=15):
 p=subprocess.run(args,capture_output=True,timeout=timeout)
 if p.returncode: raise RuntimeError(str(args)+": "+p.stderr.decode(errors="replace")[-1000:])
 return p.stdout.decode(errors="replace").strip()
def until(f,label,seconds=20):
 end=time.monotonic()+seconds
 while time.monotonic()<end:
  if f(): return
  time.sleep(.2)
 raise RuntimeError("Timeout: "+label)
def main():
 ap=argparse.ArgumentParser()
 for n in ("app","out","profile"):ap.add_argument("--"+n,required=True,type=Path)
 a=ap.parse_args()
 app=a.app.resolve(strict=True)
 out=a.out.resolve()
 if out.exists() and any(out.iterdir()):ap.error("Evidence directory not empty")
 out.mkdir(parents=True,exist_ok=True)
 p=json.loads(a.profile.read_text())
 tree=os.getenv("TIKZARIUM_APP_TREE_SHA","")
 check_profile(p,tree)
 doc=out/"library-connect.tex"
 (out/"clipboard.txt").write_bytes(SRC)
 report={"status":"FAIL","head":os.getenv("TIKZARIUM_SOURCE_SHA","NOT_RUN"),
 "tree":tree,"host":platform.platform(),"binary_sha256":sha(app.read_bytes()),
 "gui":"real egui process X11/Xvfb","visual_review":"NOT_RUN",
 "physical_win10_miktex":"NOT_RUN","physical_mac_arm":"NOT_RUN",
 "connect":"NOT_RUN","disconnect":"NOT_RUN","undo":"NOT_RUN","pdf":"NOT_RUN"}
 env=os.environ.copy()
 env.update({"XDG_CONFIG_HOME":str(out/"config"),"XDG_DATA_HOME":str(out/"data"),
             "XDG_CACHE_HOME":str(out/"cache"),"LIBGL_ALWAYS_SOFTWARE":"1",
             "WINIT_UNIX_BACKEND":"x11"})
 env.pop("WAYLAND_DISPLAY",None)
 log=(out/"app.log").open("wb")
 proc=None
 window=None
 try:
  proc=subprocess.Popen([str(app)],env=env,stdout=log,stderr=log)
  def found():
   nonlocal window
   if proc.poll() is not None:raise RuntimeError("App exited before X11 window")
   r=subprocess.run(["xdotool","search","--onlyvisible","--pid",str(proc.pid),
                     "--name","TikZarium"],capture_output=True,timeout=5)
   if r.returncode==0 and r.stdout.strip():
    window=r.stdout.decode().splitlines()[-1]
    return True
   return False
  until(found,"actual egui window",50)
  command("xdotool","windowsize","--sync",window,"1366","740")
  command("xdotool","windowmove",window,"0","0")
  try:command("xdotool","windowactivate","--sync",window)
  except RuntimeError:command("xdotool","windowfocus","--sync",window)
  if int(command("xdotool","getwindowfocus"))!=int(window):
   raise RuntimeError("X11 focus is not TikZarium")
  def shot(s):
   f=out/s
   command("import","-window",window,str(f))
   if not f.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
    raise RuntimeError("Invalid screenshot "+s)
  def click(name):
   x,y=p[name]
   command("xdotool","mousemove","--sync","--window",window,str(x),str(y),"click","1")
   time.sleep(.4)
  def key(name):
   command("xdotool","key","--clearmodifiers",name)
   time.sleep(.2)
  shot("01-start.png")
  subprocess.run(["xclip","-selection","clipboard","-i",str(out/"clipboard.txt")],
                 stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL,check=True,timeout=6)
  click("source");key("ctrl+a");key("ctrl+v");shot("02-pasted.png")
  click("path");key("ctrl+a")
  command("xdotool","type","--clearmodifiers","--delay","3",str(doc),timeout=30)
  click("save")
  until(doc.exists,"GUI initial Save")
  if doc.read_bytes()!=SRC:raise RuntimeError("Initial GUI source bytes changed")
  shot("03-saved.png")
  click("panel");shot("04-panel-expanded.png")
  click("library");shot("05-library-details.png")
  if doc.read_bytes()!=SRC:raise RuntimeError("Read-only proposal changed file")
  click("connect");shot("06-connect-click.png")
  click("save")
  until(lambda:doc.read_bytes()!=SRC,"Connect persisted")
  connected=doc.read_bytes()
  if not exact_patch(SRC,connected):
   raise RuntimeError("Connect changed source beyond one literal positioning import")
  report["connect"]="REAL_GUI_EXACT_PATCH"
  report["connected_sha256"]=sha(connected)
  shot("07-connected.png")
  click("build");shot("08-build-click.png")
  pdf=doc.with_suffix(".pdf")
  deadline=time.monotonic()+170
  while time.monotonic()<deadline and not pdf.exists():
   time.sleep(2);click("export")
  if not pdf.exists() or not pdf.read_bytes().startswith(b"%PDF-"):
   raise RuntimeError("GUI did not export real PDF")
  if "Не менять" not in command("pdftotext","-enc","UTF-8",str(pdf),"-"):
   raise RuntimeError("PDF lost Cyrillic macro")
  if "yes" not in command("pdffonts",str(pdf)):
   raise RuntimeError("PDF font not embedded")
  if doc.read_bytes()!=connected:raise RuntimeError("GUI PDF rewrote TeX")
  report["pdf"]="GUI_XELATEX_PDF_CYRILLIC_EMBEDDED_FONT"
  report["pdf_sha256"]=sha(pdf.read_bytes())
  shot("09-pdf.png")
  click("disconnect");shot("10-disconnect-click.png")
  click("save")
  until(lambda:doc.read_bytes()!=connected,"Disconnect saved")
  if doc.read_bytes()!=SRC:raise RuntimeError("Disconnect failed byte-exact source restoration")
  report["disconnect"]="REAL_GUI_SOURCE_RESTORED"
  shot("11-disconnected.png")
  click("undo");click("save")
  until(lambda:doc.read_bytes()==connected,"GUI Undo restored import")
  report["undo"]="REAL_GUI_UNDO_RESTORED"
  shot("12-undo-restored.png")
  report["status"]="PASS_AUTOMATED_X11_MANUAL_REVIEW_PENDING"
 except Exception as e:
  report["error"]=type(e).__name__+": "+str(e)
  if window:
   try:command("import","-window",window,str(out/"failure.png"))
   except Exception:pass
 finally:
  if proc and proc.poll() is None:
   proc.terminate()
   try:proc.wait(timeout=8)
   except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=5)
  log.close()
  report["files_sha256"]={f.name:sha(f.read_bytes()) for f in out.iterdir()
                          if f.is_file() and f.name!="i53-report.json"}
  (out/"i53-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2)+"\n")
  print(json.dumps(report,ensure_ascii=False,indent=2))
 return 0 if report["status"].startswith("PASS_") else 1
if __name__=="__main__":raise SystemExit(main())
