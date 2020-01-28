from network import LTE
lte = LTE()
lte.send_at_cmd('AT+CGSN=1')
