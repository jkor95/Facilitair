from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.colors import HexColor, white
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase import pdfmetrics
from reportlab.lib.units import mm
from pathlib import Path

OUT=Path('/mnt/data/dalton-meldpunt-v2/docs/Dalton-Meldpunt-personeelsposter-A4.pdf')
W,H=A4
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
pdfmetrics.registerFont(TTFont('DV',font)); pdfmetrics.registerFont(TTFont('DVB',bold))
c=canvas.Canvas(str(OUT),pagesize=A4)
brand=HexColor('#0f5e5a'); brand2=HexColor('#1e8d83'); ink=HexColor('#17313a'); muted=HexColor('#61777f'); line=HexColor('#dbe5e7'); bg=HexColor('#f4f7f8'); warn=HexColor('#fff3df'); warnline=HexColor('#edc47d')
c.setFillColor(bg); c.rect(0,0,W,H,fill=1,stroke=0)
# Header
c.setFillColor(brand); c.roundRect(14*mm,H-63*mm,W-28*mm,49*mm,7*mm,fill=1,stroke=0)
c.setFillColor(white); c.setFont('DVB',24); c.drawString(24*mm,H-32*mm,'Dalton Meldpunt')
c.setFont('DV',11.5); c.drawString(24*mm,H-42*mm,'Snel een facilitaire melding maken - direct vanaf je telefoon')
# QR placeholder
qx=W-73*mm; qy=H-57*mm; qs=34*mm
c.setStrokeColor(HexColor('#b9d2cf')); c.setLineWidth(1.7); c.setDash(4,3); c.roundRect(qx,qy,qs,qs,4*mm,fill=0,stroke=1); c.setDash()
c.setFillColor(white); c.setFont('DVB',9); c.drawCentredString(qx+qs/2,qy+18*mm,'QR-CODE'); c.setFont('DV',7); c.drawCentredString(qx+qs/2,qy+13*mm,'na publicatie')
# Use cases
c.setFillColor(ink); c.setFont('DVB',15); c.drawString(18*mm,H-81*mm,'Wanneer gebruik je het meldpunt?')
items=['Iets in een lokaal of ruimte is kapot','Deur, slot, lamp, meubel of sanitair heeft aandacht nodig','Schoonmaak- of voorraadmelding','Technische of facilitaire storing','Andere facilitaire melding voor conciërge/facilitair']
y=H-92*mm
c.setFont('DV',9.8)
for item in items:
    c.setFillColor(brand2); c.circle(21*mm,y+1.4*mm,1.4*mm,fill=1,stroke=0)
    c.setFillColor(ink); c.drawString(26*mm,y,item); y-=8.5*mm
# Steps
boxx=18*mm; boxy=73*mm; boxw=W-36*mm; boxh=87*mm
c.setFillColor(white); c.setStrokeColor(line); c.roundRect(boxx,boxy,boxw,boxh,6*mm,fill=1,stroke=1)
c.setFillColor(ink); c.setFont('DVB',15); c.drawString(26*mm,boxy+boxh-14*mm,'Zo maak je een melding')
steps=[
 ('1','Scan de QR-code','of open de meldlink uit de personeelsmail.'),
 ('2','Vul naam en locatie in','Bijv. lokaal B1.14, mediatheek of gymzaal.'),
 ('3','Kies categorie en urgentie','Beschrijf kort wat er aan de hand is.'),
 ('4','Voeg eventueel een foto toe','Een duidelijke foto helpt facilitair sneller te beoordelen.'),
 ('5','Verstuur de melding','Je krijgt direct een meldingsnummer.')
]
sy=boxy+boxh-28*mm
for num,title,sub in steps:
    c.setFillColor(brand); c.roundRect(27*mm,sy-4*mm,10*mm,10*mm,3*mm,fill=1,stroke=0)
    c.setFillColor(white); c.setFont('DVB',9); c.drawCentredString(32*mm,sy-.7*mm,num)
    c.setFillColor(ink); c.setFont('DVB',10); c.drawString(42*mm,sy+1.2*mm,title)
    c.setFillColor(muted); c.setFont('DV',8.5); c.drawString(42*mm,sy-4.1*mm,sub)
    sy-=12.8*mm
# Email note
c.setFillColor(HexColor('#eaf8f0')); c.setStrokeColor(HexColor('#bce7cf')); c.roundRect(18*mm,46*mm,W-36*mm,19*mm,5*mm,fill=1,stroke=1)
c.setFillColor(HexColor('#12603d')); c.setFont('DVB',9.2); c.drawString(25*mm,58*mm,'E-mailadres ingevuld?')
c.setFont('DV',8.2); c.drawString(25*mm,52.5*mm,'Dan kan facilitair je bij het afronden van de melding een e-mailbericht sturen.')
# Urgency note
c.setFillColor(warn); c.setStrokeColor(warnline); c.roundRect(18*mm,20*mm,W-36*mm,19*mm,5*mm,fill=1,stroke=1)
c.setFillColor(HexColor('#744900')); c.setFont('DVB',9.2); c.drawString(25*mm,32*mm,'Spoed?')
c.setFont('DV',8.0); c.drawString(25*mm,26.5*mm,'Gebruik Spoed alleen als snelle actie echt nodig is. Bij direct gevaar: volg de interne noodprocedure.')
# Footer
c.setFillColor(muted); c.setFont('DV',7.6); c.drawString(18*mm,11.5*mm,'Meldlink: [VOEG HIER NA PUBLICATIE DE GITHUB PAGES-LINK TOE]')
c.drawRightString(W-18*mm,11.5*mm,'Dalton Meldpunt - personeelsuitleg')
c.save()
print(OUT)
