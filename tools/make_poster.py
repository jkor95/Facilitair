from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from pathlib import Path
import qrcode

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs'/'Meldpunt-VWO-personeelsposter-A4.pdf'
QR=ROOT/'docs'/'_qr.png'
qrcode.make('https://meldpuntvwo.nl/').save(QR)
W,H=A4
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('DV',font)); pdfmetrics.registerFont(TTFont('DVB',bold))
c=canvas.Canvas(str(OUT),pagesize=A4)
brand=HexColor('#0f5e5a'); brand2=HexColor('#1e8d83'); ink=HexColor('#17313a'); muted=HexColor('#61777f'); line=HexColor('#dbe5e7'); bg=HexColor('#f4f7f8')
c.setFillColor(bg); c.rect(0,0,W,H,fill=1,stroke=0)
# Header
c.setFillColor(white); c.setStrokeColor(line); c.roundRect(14*mm,H-66*mm,W-28*mm,52*mm,7*mm,fill=1,stroke=1)
logo=ImageReader(str(ROOT/'assets'/'logo-meldpunt-vwo.png'))
c.drawImage(logo,21*mm,H-60*mm,width=62*mm,height=40*mm,preserveAspectRatio=True,anchor='sw',mask='auto')
c.setFillColor(brand); c.setFont('DVB',18); c.drawString(88*mm,H-35*mm,'Meldpunt VWO')
c.setFillColor(muted); c.setFont('DV',9.2); c.drawString(88*mm,H-44*mm,'Facilitaire melding')
c.drawString(88*mm,H-50*mm,'voor personeel')
# QR
qs=34*mm; qx=W-53*mm; qy=H-60*mm
c.drawImage(str(QR),qx,qy,width=qs,height=qs,mask='auto')
# Intro
c.setFillColor(ink); c.setFont('DVB',15); c.drawString(18*mm,H-84*mm,'Iets kapot, vies, leeg of onveilig?')
c.setFont('DV',10.5); c.drawString(18*mm,H-93*mm,'Scan de QR-code en geef uw melding snel door aan facilitair.')
# Examples box
c.setFillColor(white); c.setStrokeColor(line); c.roundRect(18*mm,H-150*mm,W-36*mm,45*mm,6*mm,fill=1,stroke=1)
c.setFillColor(ink); c.setFont('DVB',12); c.drawString(25*mm,H-118*mm,'Voorbeelden')
items=['Docking werkt niet','Lamp kapot','Stoel defect','Deurklink zit los','Stopcontact werkt niet']
y=H-129*mm
c.setFont('DV',9.5)
for i,item in enumerate(items):
    x=25*mm if i<3 else 105*mm
    yy=y-(i if i<3 else i-3)*9*mm
    c.setFillColor(brand2); c.circle(x,yy+1.2*mm,1.4*mm,fill=1,stroke=0)
    c.setFillColor(ink); c.drawString(x+5*mm,yy,item)
# Steps
c.setFillColor(ink); c.setFont('DVB',15); c.drawString(18*mm,H-170*mm,'Zo werkt het')
steps=[('1','Scan de QR-code'),('2','Vul naam en locatie/ruimte in'),('3','Omschrijf kort wat er aan de hand is'),('4','Voeg eventueel een foto toe'),('5','Verstuur de melding')]
sy=H-180*mm
for num,text in steps:
    c.setFillColor(brand); c.circle(25*mm,sy+1.5*mm,4.5*mm,fill=1,stroke=0)
    c.setFillColor(white); c.setFont('DVB',8.5); c.drawCentredString(25*mm,sy-.8*mm,num)
    c.setFillColor(ink); c.setFont('DVB',10); c.drawString(36*mm,sy,text)
    sy-=11*mm
# Location guidance
c.setFillColor(HexColor('#eaf8f0')); c.setStrokeColor(HexColor('#bce7cf')); c.roundRect(18*mm,34*mm,W-36*mm,27*mm,5*mm,fill=1,stroke=1)
c.setFillColor(HexColor('#12603d')); c.setFont('DVB',9.5); c.drawString(25*mm,51*mm,'Locatie duidelijk invullen')
c.setFont('DV',8.6); c.drawString(25*mm,44.5*mm,'Bijvoorbeeld: 003, 105, 225 of Personeelswerkkamer.')
c.drawString(25*mm,39*mm,'Bij direct gevaar of spoed: volg de interne noodprocedure en neem direct persoonlijk contact op.')
# Footer
c.setFillColor(muted); c.setFont('DV',7.8); c.drawString(18*mm,15*mm,'https://meldpuntvwo.nl/')
c.drawRightString(W-18*mm,15*mm,'Meldpunt VWO - personeelsuitleg')
c.save()
QR.unlink(missing_ok=True)
print(OUT)
