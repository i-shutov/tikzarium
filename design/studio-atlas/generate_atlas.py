#!/usr/bin/env python3
"""Generate vector-first Russian TikZarium Studio UI mockups; not app screenshots."""
from pathlib import Path
import argparse, shutil, subprocess
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser(); p.add_argument('--output-dir',type=Path,default=ROOT.parent/'atlas-output'); OUT=p.parse_args().output_dir.resolve(); OUT.mkdir(parents=True,exist_ok=True)
PDF=OUT/'TikZarium_Studio_UI_Atlas_RU.pdf'; FIX=ROOT/'roadmap/Tikzarium_Scientific_142_R4'; pop=shutil.which('pdftoppm')
if not pop: raise RuntimeError('pdftoppm is required for the real compiled PDF fixtures')
def fixture(src,name):
    source=FIX/src; target=OUT/f'{name}.png'
    if not source.is_file(): raise FileNotFoundError(f'Required fixture is missing: {source}')
    subprocess.run([pop,'-png','-f','1','-singlefile','-r','130',str(source),str(target.with_suffix(''))],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    if not target.is_file() or not target.stat().st_size: raise RuntimeError(f'Fixture rasterization failed: {target}')
    return target
SV=fixture(Path('evidence/compiled/SV-001.pdf'),'SV-001'); F14=fixture(Path('evidence/compiled/AK-F14_3.pdf'),'AK-F14_3')
FD=Path('/usr/share/fonts/truetype/dejavu')
for name,file in [('Sans','DejaVuSans.ttf'),('Bold','DejaVuSans-Bold.ttf'),('Mono','DejaVuSansMono.ttf'),('Serif','DejaVuSerif.ttf')]: pdfmetrics.registerFont(TTFont(name,str(FD/file)))
W,H=1280,800; c=canvas.Canvas(str(PDF),pagesize=(W,H),pageCompression=1); c.setTitle('TikZarium Studio — атлас дизайна интерфейсов'); c.setAuthor('TikZarium Studio — дизайн-макет')
# Exact chrome palette tokens from ui_theme.rs.
T={
'Midnight':dict(panel='#131A27',window='#1A2435',inset='#0C131F',button='#1F2C3F',active='#244E73',outline='#3D526C',text='#E6F0FB',accent='#2D6FAE',link='#7DBFEF'),
'Dark':dict(panel='#18212E',window='#1E2A3A',inset='#111A26',button='#233142',active='#285470',outline='#465D76',text='#E5ECF5',accent='#256FA0',link='#82C7EF'),
'Light':dict(panel='#F3F7FB',window='#FFFFFF',inset='#EDF4F9',button='#FBFDFF',active='#CCE1F2',outline='#C7D7E2',text='#1A2A3C',accent='#2567A2',link='#205F9D'),
'Paper':dict(panel='#F7F5EF',window='#FFFDF8',inset='#EFEEE2',button='#FDFCF7',active='#C3E0D6',outline='#CAD2CC',text='#25384B',accent='#206470',link='#1F6D7D')}
BG=HexColor('#101824'); CARD=HexColor('#172233'); EDGE=HexColor('#2D3B4F'); FG=HexColor('#E7EDF5'); MUT=HexColor('#9EADBE'); BLUE=HexColor('#70B5E8'); GOLD=HexColor('#E2B76F'); GREEN=HexColor('#84C7A0')
def box(x,y,w,h,fill,stroke=None,r=9):
 c.setFillColor(HexColor(fill) if isinstance(fill,str) else fill)
 if stroke:c.setStrokeColor(HexColor(stroke) if isinstance(stroke,str) else stroke)
 c.setLineWidth(1);c.roundRect(x,y,w,h,r,fill=1,stroke=bool(stroke))
def tx(x,y,s,z=11,col=FG,font='Sans'):
 c.setFillColor(col);c.setFont(font,z);c.drawString(x,y,s)
def ct(x,y,s,z=11,col=FG,font='Sans'):
 c.setFillColor(col);c.setFont(font,z);c.drawCentredString(x,y,s)
def para(x,y,s,width,z=11,col=MUT,lead=15,font='Sans',maxn=99):
 rows=[]; row=''
 for word in s.split():
  t=(row+' '+word).strip()
  if stringWidth(t,font,z)>width and row: rows.append(row);row=word
  else:row=t
 if row:rows.append(row)
 for i,r in enumerate(rows[:maxn]):tx(x,y-i*lead,r,z,col,font)
def rule(x,y,x2,y2,col=EDGE):c.setStrokeColor(col);c.setLineWidth(1);c.line(x,y,x2,y2)
def badge(x,y,concept=False,label=None):
 s=label or ('КОНЦЕПТ • ещё не реализовано' if concept else 'МАКЕТ • на реализованных возможностях'); co=HexColor('#5B482B') if concept else HexColor('#234B3B'); fg=GOLD if concept else GREEN
 box(x,y,stringWidth(s,'Bold',9)+20,22,co,None,10);tx(x+10,y+7,s,9,fg,'Bold')
def page(n,title,deck,concept=False):
 c.setFillColor(BG);c.rect(0,0,W,H,fill=1,stroke=0);tx(54,752,'TIKZARIUM  /  SCIENTIFIC STUDIO',11,BLUE,'Bold')
 size=30
 while stringWidth(title,'Bold',size)>1168 and size>20:size-=1
 tx(54,703,title,size,FG,'Bold');para(54,676,deck,1130,13,MUT,18);badge(54,623,concept);tx(1178,38,f'{n:02d} / 14',10,MUT,'Mono');rule(54,60,1226,60)
def button(x,y,w,label,primary=False):box(x,y,w,28,'#244E73' if primary else '#1F2C3F','#3D526C',7);tx(x+9,y+9,label,9,FG,'Bold' if primary else 'Sans')
def frame(x,y,w,h,theme='Midnight',mode='Эскиз'):
 t=T[theme];box(x,y,w,h,t['window'],t['outline'],12);box(x,y+h-44,w,44,t['panel'],None,10);c.setFillColor(HexColor(t['panel']));c.rect(x,y+h-44,w,15,fill=1,stroke=0)
 tx(x+16,y+h-27,'TikZarium',12,HexColor(t['text']),'Bold')
 for j,s in enumerate(['↥','▣']):box(x+118+j*39,y+h-36,30,28,t['button'],t['outline'],6);ct(x+133+j*39,y+h-27,s,13,HexColor(t['text']),'Bold')
 box(x+203,y+h-36,112,28,t['accent'],None,7);tx(x+213,y+h-27,'Собрать PDF',10,HexColor(t['text']),'Bold')
 box(x+323,y+h-36,30,28,t['button'],t['outline'],6);ct(x+338,y+h-27,'⇧',13,HexColor(t['text']),'Bold');tx(x+365,y+h-27,'Файл   Вид',10,HexColor(t['text']));tx(x+w-230,y+h-27,'F1  ?   Диагностика',10,HexColor(t['link']))
 my=y+h-78
 for j,s in enumerate(['Эскиз','PDF']):
  sel=s==mode;box(x+14+j*65,my,57,25,t['active'] if sel else t['button'],None,6);ct(x+42+j*65,my+8,s,10,HexColor(t['text']),'Bold' if sel else 'Sans')
 tx(x+160,my+7,'figure.tex',10,HexColor(t['text']),'Mono');tx(x+w-150,my+7,'● Изменено',10,GOLD,'Bold');return t

def sourcepane(x,y,w,h,t,kind='sv'):
 box(x,y,w,h,t['inset'],t['outline'],7);tx(x+12,y+h-20,'ИСТОЧНИК  ·  '+('AK-F14_3 excerpt' if kind=='resource' else 'tikz.circle' if kind=='circle' else 'SV-001 excerpt'),8,HexColor(t['link']),'Bold')
 if kind=='circle': code=[r'\begin{tikzpicture}',r'  \draw (0,0)',r'    circle (1.2);',r'\end{tikzpicture}']
 elif kind=='resource':code=[r'\def\datadir{data}',r'\IfFileExists{data/...}',r'  {\def\datadir{../data}}',r'...',r'\draw[sol] plot file',r'  {\datadir/F14_3_left.dat};',r'\draw[sol] plot file',r'  {\datadir/F14_3_middle.dat};',r'\draw[sol] plot file ...']
 else:code=[r'\begin{axis}[...',r'  samples=150, domain=-3:3,',r'  xtick distance=1,',r'  ytick distance=0.5,',r'  xlabel=$\beta^{1/2}\tau_0$,',r'  ylabel=$v$]',r'\addplot[red,name path=S,thick]',r'  {.05+2.4*gauss(x,0,1)};',r'\end{axis}']
 fs=8
 for i,s in enumerate(code): yy=y+h-42-i*15;tx(x+10,yy,f'{i+1:02d}',7,HexColor('#63758C'),'Mono');tx(x+34,yy,s,fs,HexColor(t['text']),'Mono')
def preview(x,y,w,h,t,img=None,kind='pdf',label='PDF · точный результат внешнего XeLaTeX'):
 box(x,y,w,h,'#111A26',t['outline'],8);tx(x+12,y+h-21,'ЭСКИЗ / GEOMETRY' if kind=='circle' else 'PDF / PAGE 1',8,HexColor(t['link']),'Bold')
 if kind!='circle':
  for j,s in enumerate(['−','100%','+','Fit width']):tx(x+w-180+j*43,y+h-21,s,7,HexColor(t['text']))
 pw=min(w-42,(h-62)*1.55);ph=min(h-58,pw/1.55);px=x+(w-pw)/2;py=y+(h-ph-28)/2;box(px,py,pw,ph,'#FFFFFF','#D6DEE8',3)
 if kind=='circle':c.setStrokeColor(HexColor('#18212A'));c.setLineWidth(1.6);c.circle(px+pw/2,py+ph*.51,min(pw,ph)*.24,stroke=1,fill=0);c.setFillColor(HexColor('#18212A'));c.circle(px+pw/2,py+ph*.51,2.3,fill=1,stroke=0)
 elif img:c.drawImage(ImageReader(img),px+pw*.04,py+ph*.05,width=pw*.92,height=ph*.9,preserveAspectRatio=True,anchor='c',mask='auto')
 else:
  p=c.beginPath();p.moveTo(px+pw*.12,py+ph*.22)
  for i in range(1,81):
   z=-3+6*i/80;p.lineTo(px+pw*(.12+.76*i/80),py+ph*(.22+.6*pow(2.71828,-z*z/2)))
  c.setStrokeColor(HexColor('#D93D37'));c.setLineWidth(1.8);c.drawPath(p)
  c.setStrokeColor(HexColor('#20252B'));c.setLineWidth(.8);c.line(px+pw*.12,py+ph*.2,px+pw*.88,py+ph*.2);c.line(px+pw*.5,py+ph*.12,px+pw*.5,py+ph*.86)
 tx(x+12,y+7,'Эскиз геометрии · приближённый preview' if kind=='circle' else ('PDF fixture AK-F14_3 · compiled evidence' if img==F14 else 'PDF fixture SV-001 · compiled evidence; не screenshot UI' if img else label),7,MUT)
def inspector(x,y,w,h,t,kind='axis',tab='Свойства'):
 box(x,y,w,h,t['panel'],t['outline'],8)
 for j,s in enumerate(['Свойства','Библиотеки','Справка']):tx(x+8+j*(w-16)/3,y+h-22,s,7,HexColor(t['link'] if s==tab else t['text']),'Bold' if s==tab else 'Sans')
 rule(x+8,y+h-31,x+w-8,y+h-31,HexColor(t['outline']))
 if kind=='resources':
  tx(x+12,y+h-48,'Ресурсы сборки',8.5,FG,'Bold');tx(x+12,y+h-65,'Из TeX source',6.8,HexColor(t['link']),'Bold')
  for i,n in enumerate(['F14_3_left.dat','F14_3_middle.dat','F14_3_right.dat']):tx(x+12,y+h-80-i*12,n,6.5,FG,'Mono')
  rule(x+12,y+h-119,x+w-12,y+h-119,HexColor(t['outline']));tx(x+12,y+h-133,'Лексический путь',6.5,FG,'Bold');tx(x+12,y+h-145,r'\datadir · макрос',6.5,HexColor(t['link']),'Mono')
  para(x+12,y+h-158,'Фактические inputs проверяются по `.fls`; SHA-256 и свежесть экспорта показываются после проверки.',w-24,6.2,MUT,8,maxn=2);return
 if kind=='circle':
  tx(x+12,y+h-51,'Окружность · строка 18',8,FG,'Bold');tx(x+12,y+h-73,'Центр x / y',7,MUT)
  box(x+12,y+h-105,74,25,t['inset'],t['outline'],5);tx(x+20,y+h-97,'0',7,FG,'Mono');box(x+94,y+h-105,74,25,t['inset'],t['outline'],5);tx(x+102,y+h-97,'0',7,FG,'Mono')
  tx(x+12,y+h-137,'Радиус',7,MUT);box(x+75,y+h-162,94,22,t['inset'],t['outline'],5);tx(x+83,y+h-154,'1.2',7,FG,'Mono')
  button(x+12,y+8,92,'Применить',True);button(x+111,y+8,76,'Undo');tx(x+12,y+2,'Одна правка · один шаг Undo',6.5,MUT);return
 if tab=='Справка':tx(x+12,y+h-52,'Справка C · F1',9,FG,'Bold');tx(x+12,y+h-72,'tikz.circle',8,HexColor(t['link']),'Mono');para(x+12,y+h-92,'Параметры и ограничения берутся из каталога команды.',w-24,8,FG,12,maxn=5);return
 tx(x+12,y+h-51,'axis · строка 42',8,FG,'Bold');tx(x+12,y+h-70,'Параметр',7,MUT);box(x+12,y+h-95,w-24,22,t['inset'],t['outline'],5);tx(x+20,y+h-88,'Нижняя граница y  ▾',7,FG)
 tx(x+12,y+h-112,'source',6.5,MUT);tx(x+74,y+h-112,'предлагается',6.5,MUT);box(x+12,y+h-146,(w-34)/2,26,t['inset'],t['outline'],5);tx(x+21,y+h-138,'ymin = 0',7,FG,'Mono');box(x+22+(w-34)/2,y+h-146,(w-34)/2,26,t['active'],t['outline'],5);tx(x+31+(w-34)/2,y+h-138,'−0.25',7,FG,'Mono')
 button(x+12,y+8,98,'Применить',True);tx(x+119,y+18,'Справка · F1',6.8,HexColor(t['link']),'Bold');para(x+12,y+42,'Правка только буквального key; source остаётся главным.',w-24,6.5,MUT,9,maxn=1)
def workspace(x,y,w,h,theme='Midnight',img=None,kind='axis',src='sv',tab='Свойства'):
 t=frame(x,y,w,h,theme,'PDF' if img else 'Эскиз');iy=y+22;ih=h-112;rail=60;side=max(225,min(290,w*.22));sw=w*.31;cw=w-rail-side-sw-54;rx=x+12;ry=iy+8
 box(rx,ry,rail,ih-14,t['panel'],t['outline'],8);tools=['╱','→','□','○','T','⌁'];th=(ih-34)/6
 for i,s in enumerate(tools):yy=ry+ih-39-(i+1)*th+4;sel=(kind=='circle' and i==3);box(rx+7,yy,rail-14,th-4,t['active'] if sel else t['button'],None,6);ct(rx+rail/2,yy+(th-4)/2-4,s,14,HexColor(t['text']),'Bold')
 sx=rx+rail+10;sourcepane(sx,iy+8,sw,ih-14,t,src);cx=sx+sw+10;preview(cx,iy+8,cw,ih-14,t,img,'circle' if kind=='circle' else 'pdf' if img else 'curve');ix=cx+cw+10;inspector(ix,iy+8,side,ih-14,t,kind,tab)
def note(x,y,n,title,body,w):box(x,y,w,74,CARD,EDGE,9);c.setFillColor(BLUE);c.circle(x+23,y+49,12,fill=1,stroke=0);ct(x+23,y+45,str(n),10,HexColor('#0C131F'),'Bold');tx(x+44,y+51,title,10,FG,'Bold');para(x+44,y+32,body,w-57,8.5,MUT,12,maxn=2)
def end():c.showPage()
# 01 cover
c.setFillColor(BG);c.rect(0,0,W,H,fill=1,stroke=0);tx(64,738,'TIKZARIUM / DESIGN ATLAS',12,BLUE,'Bold');tx(64,674,'Научная Studio',42,FG,'Bold');tx(64,627,'Атлас дизайна интерфейсов',25,FG);para(64,585,'Векторные макеты нативной desktop-среды для научной графики, редактируемого TeX и проверяемого PDF.',530,16,MUT,24);badge(64,500,True,'НАПРАВЛЕНИЕ ДИЗАЙНА · НЕ СКРИНШОТ');workspace(64,112,1152,345,img=SV);tx(64,77,'Базовый принцип',11,BLUE,'Bold');tx(64,55,'Источник видим. Точный результат создаёт XeLaTeX. Эскиз отделён от PDF.',13,FG);tx(1178,38,'01 / 14',10,MUT,'Mono');end()
# 02 main workspace
page(2,'Главная рабочая область','Обычный .tex рядом с интерактивным эскизом и PDF, собранным внешним XeLaTeX.');workspace(54,155,1172,450,img=SV);note(54,86,1,'Действия документа','Открыть · Сохранить · Собрать PDF · Экспортировать',350);note(424,86,2,'Источник рядом','Редактируемый TeX виден постоянно.',380);note(824,86,3,'Один Inspector','Свойства, Библиотеки или Справка.',402);end()
# 03 tools
page(3,'Шесть прямых инструментов','Шесть команд доступны прямо с рельса; отдельная группа-поповер не нужна.');workspace(54,264,1172,340,kind='circle',src='circle');labels=[('Линия','точки и отрезки'),('Стрелка','направленный отрезок'),('Прямоугольник','контур'),('Окружность','центр и радиус'),('Узел','текст или математика'),('Кубическая кривая','кривая Безье')]
for i,(a,b) in enumerate(labels):xx=68+i*194;box(xx,157,178,79,CARD,EDGE,10);ct(xx+24,205,['╱','→','□','○','T','⌁'][i],20,BLUE,'Bold');tx(xx+50,208,a,10,FG,'Bold');tx(xx+50,188,b,8.5,MUT)
tx(68,126,'Подсказка показывает имя TikZ-команды и ссылку на C-каталог.',10,MUT);tx(68,103,'Инструменты не обещают обратное восстановление TikZ из PDF.',10,MUT);end()
# 04 inspector
page(4,'Inspector: одна обратимая операция','Поддержанное свойство, минимальный source patch, одна операция Undo.');workspace(54,280,1172,325,kind='circle',src='circle');note(54,87,1,'Подтверждённые поля','Неизвестные макросы остаются opaque.',350);note(424,87,2,'Минимальный патч','Меняется выбранное значение; comments сохраняются.',380);note(824,87,3,'Одна транзакция','Apply создаёт одну правку, Undo возвращает прежний source.',402);end()
# 05 PGFPlots
page(5,'PGFPlots: буквальные свойства','Интегрированная поверхность меняет только поддержанные литералы; выражения и macro-valued keys остаются opaque.');props=['samples','domain','xmin','xmax','ymin','ymax','xtick distance','ytick distance','width','height','mark','xtick','ytick','xlabel','ylabel']
for i,s in enumerate(props):x=70+(i%3)*380;y=535-(i//3)*66;box(x,y,340,48,CARD,EDGE,8);tx(x+15,y+26,f'{i+1:02d}',9,BLUE,'Mono');tx(x+54,y+17,s,13,FG,'Mono')
box(70,130,1100,87,'#122033','#35465D',10);tx(92,185,'Пример безопасного редактирования',11,BLUE,'Bold');tx(92,159,r'\addplot[mark=none,samples=150,domain=-3:3] {...};',12,FG,'Mono');tx(92,139,'В настройках ряда меняются samples / domain / mark; formula body сохраняется буквально.',9,MUT);tx(70,96,'Ограничение · неизвестные keys, TeX macros и формулы не нормализуются и не перезаписываются.',9,GOLD,'Bold');end()
# 06 Opaque formula
page(6,'Формулы и неизвестные конструкции остаются opaque','Сохраняйте native source, когда Studio не умеет безопасно редактировать выражение.');box(54,205,620,390,'#0C131F','#3D526C',12);tx(78,562,'figure.tex · редактируемый source',12,BLUE,'Bold');code=[r'\begin{axis}[',r'  domain=-4:4,',r'  samples=180,',r'  xlabel={Время $t$},',r'  ylabel={Плотность $\rho(t)$}',r']',r'\addplot[thick,blue] {gauss(t)};',r'\end{axis}']
for i,s in enumerate(code):tx(82,520-i*34,s,15,FG,'Mono')
box(710,378,500,217,CARD,EDGE,12);tx(740,550,'Непрозрачный фрагмент',16,FG,'Bold');para(740,518,'Если формула или macro не входит в подтверждённый subset, не показывать ложные handles и не перестраивать исходник.',420,12,MUT,18);box(740,420,405,46,'#43371F',None,7);tx(756,437,'Синтаксис сохранён · визуальная правка недоступна',9,GOLD,'Bold');tx(54,161,'Правила',12,BLUE,'Bold')
for i,s in enumerate(['Точный PDF остаётся результатом внешнего XeLaTeX.','Handles подписываются как приблизительная визуализация.','Формулу можно менять в source editor; не парсить в универсальную сцену.']):tx(73,130-i*24,'• '+s,10,FG)
end()
# 07 F1
page(7,'Контекстная справка F1','Помогает понять выбранную команду, не уводя от source и preview.');workspace(54,230,1172,375,img=SV,tab='Справка');tx(54,152,'F1 открывает dock справки; повторное нажатие возвращает к свойствам.',11,MUT);end()
# 08 build states
page(8,'Сборка: source → XeLaTeX → PDF','Состояния разделяют успешный запуск, недоступность движка и устаревший последний результат.');states=[('01','Сборка идёт','XeLaTeX компилирует текущий source.','Отмена доступна; source остаётся видимым.','#244E73'),('02','Движок недоступен','Проверьте MiKTeX или TIKZARIUM_XELATEX.','Без скрытой установки.','#4A3D26'),('03','Build failed','Последний успешный PDF помечен stale.','Старый результат не выдаётся за свежий.','#4A2A33')]
for i,(num,title,body,foot,col) in enumerate(states):x=54+i*394;box(x,335,360,257,CARD,EDGE,14);box(x+22,540,44,28,col,None,8);tx(x+34,549,num,9,FG,'Mono');tx(x+22,503,title,18,FG,'Bold');para(x+22,469,body,310,12,MUT,18);rule(x+22,406,x+330,406);para(x+22,382,foot,310,10,GOLD,14)
box(54,156,1152,116,'#0C131F','#3D526C',12);tx(78,243,'Правило stale-result',13,BLUE,'Bold');tx(78,215,'Последний успешный PDF ≠ PDF текущего source',13,FG,'Mono');tx(78,185,'Экспорт текущего результата ждёт новой успешной сборки.',10,MUT);end()
# 09 themes
page(9,'Четыре реальные палитры','Цвет оболочки меняется; лист PDF и цвет рисунка остаются независимыми.')
for i,name in enumerate(['Light','Dark','Midnight','Paper']):q=T[name];x=54+i*296;box(x,220,270,370,q['panel'],q['outline'],14);tx(x+18,550,name,15,HexColor(q['text']),'Bold');box(x+18,490,234,44,q['window'],q['outline'],7);tx(x+30,507,'Рабочая область',10,HexColor(q['text']));box(x+18,426,234,42,q['inset'],None,6);tx(x+30,441,'surface / inset',9,HexColor(q['text']),'Mono');box(x+18,362,108,36,q['button'],q['outline'],6);tx(x+30,375,'Кнопка',9,HexColor(q['text']));box(x+144,362,108,36,q['active'],None,6);tx(x+155,375,'Выбрано',9,HexColor(q['text']));box(x+18,283,234,50,q['accent'],None,7);tx(x+30,302,'Акцент',10,HexColor('#FFFFFF'),'Bold');tx(x+18,245,f"Контур {q['outline']}",8,HexColor(q['text']),'Mono')
box(54,138,1172,45,'#0C131F',EDGE,8);tx(72,155,'Токены перенесены из ui_theme.rs. GUI palette не меняет figure typography или PDF colours.',10,MUT);end()
# 10 compact
page(10,'Компактная раскладка без потери source','Макет для стресс-viewport 1024×640; сохраняет source рядом с эскизом или PDF.',True);workspace(54,244,1172,356,img=SV,kind='axis');tx(70,209,'Узкое окно',10,GOLD,'Bold');tx(70,187,'• иконки имеют tooltip и keyboard focus',9,MUT);tx(70,168,'• табы PDF / Эскиз остаются явными',9,MUT);tx(70,149,'• Inspector открывается и закрывается явно',9,MUT);box(786,129,410,79,CARD,EDGE,8);tx(804,178,'Клавиатурный фокус',10,BLUE,'Bold');para(804,157,'Видимый focus ring и текстовая метка; состояние не кодируется только цветом.',365,9,MUT,13,maxn=2);end()
# 11 export
page(11,'Экспорт актуального PDF','Мокап приложения; native OS file-picker не перерисовывается как поддельное системное окно.');workspace(54,308,1172,295,img=SV);box(275,173,730,116,'#1A2435','#3D526C',12);tx(301,260,'Экспорт PDF',17,FG,'Bold');tx(301,233,'XeLaTeX · текущая ревизия source',10,GREEN,'Bold');tx(301,208,'Действие',9,MUT);button(381,195,172,'Экспорт PDF…',True);tx(575,208,'Свежесть',9,MUT);tx(575,195,'Актуальный PDF',10,GREEN,'Bold');tx(54,133,'Экспорт доступен только для свежего успешного результата.',10,MUT);tx(54,110,'Без compositor, batch export или сравнения версий.',10,GOLD);end()
# 12 engine concept
page(12,'Дальнейший научный профиль: явный движок','Концепт: Asymptote и Typst/CeTZ здесь не представлены как уже подключённые функции.',True);box(54,205,560,385,CARD,EDGE,12);tx(82,550,'Build Centre / концепт',18,FG,'Bold')
for i,(a,b,s) in enumerate([('Engine','XeLaTeX','текущий путь'),('Version','внешняя установка','проверить'),('Dependencies','TikZ + PGFPlots','проект'),('Compatibility','не подтверждено','до сборки')]):y=493-i*65;tx(82,y,a,10,MUT,'Bold');tx(220,y,b,11,FG,'Mono');tx(432,y,s,9,GOLD);rule(82,y-17,574,y-17) if i<3 else None
button(82,235,190,'Собрать PDF',True);box(655,205,571,385,'#101824',EDGE,12);tx(684,550,'Профили-кандидаты',18,FG,'Bold')
for i,(s,q) in enumerate([('TikZ / PGFPlots','научная база'),('Asymptote','концепт'),('Typst / CeTZ','концепт')]):y=485-i*78;box(684,y-17,502,54,CARD,EDGE,8);tx(702,y+3,s,13,FG,'Bold');tx(1025,y+3,q,9,BLUE if i==0 else GOLD)
para(684,236,'Движок, версия, зависимости и совместимость — раздельные состояния. Без тихого fallback и автоустановки.',498,10,MUT,15);end()
# 13 resources
page(13,'Ресурсы рядом с исходником','Дизайн ресурсного workflow на реальных plot-file зависимостях: source refs отдельно, фактические .fls inputs отдельно.');workspace(54,310,1172,293,img=F14,kind='resources',src='resource');tx(54,256,'AK-F14_3 использует три внешних plot-file ресурса.',10,BLUE,'Bold');tx(54,226,'Лексические ссылки с TeX-макросами не смешиваются с наблюдёнными .fls inputs.',10,GOLD);tx(54,197,r'Source: \datadir/F14_3_*.dat  ·  hashes: only observed ledger',9,MUT,'Mono');end()
# 14 handoff/roadmap
page(14,'Компоненты интерфейса и граница готовности','Статусы в атласе описывают макет, а не приложение или выпуск.',True);cols=[('СЕЙЧАС','TeX editor','Эскиз TikZ','точный XeLaTeX PDF','Inspector / F1','PGFPlots literals','.fls / SHA freshness'),('НАУЧНЫЙ СЛЕДУЮЩИЙ ШАГ','formula guards','source-first edits','plot resources','build provenance','export freshness'),('ПОСЛЕ НАУКИ','UML','BPMN','инженерия','химия / биология','анимация','остальные домены','Data Figure · последним')]
for i,(head,*rows) in enumerate(cols):
 x=54+i*394;box(x,160,360,429,CARD,EDGE,12);tx(x+22,548,head,9,BLUE if i==0 else GOLD if i==1 else MUT,'Bold')
 for j,s in enumerate(rows):
  y=499-j*47;box(x+20,y-13,320,39,'#0C131F',EDGE,7);tx(x+34,y+1,s,10,FG,'Bold')
tx(54,123,'Порядок: научная графика → UML → BPMN → инженерия → химия/биология → анимация → другое → данные.',10,MUT);tx(54,99,'Атлас не подтверждает screenshots, Win10/DPI/IME или платформенную приёмку.',10,GOLD);end()
c.save();print(PDF)
