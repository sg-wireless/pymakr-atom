from network import LTE
lte = LTE()
lte.attach(band=20, apn="nb.inetd.gdsp")
while not lte.isattached():
    time.sleep(0.25)
lte.connect()       # start a data session and obtain an IP address
while not lte.isconnected():
    time.sleep(0.25)

# now use socket as usual...
