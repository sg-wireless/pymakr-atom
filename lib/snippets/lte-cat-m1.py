import socket
import ssl
import time
from network import LTE

lte = LTE()         # instantiate the LTE object
lte.attach()        # attach the cellular modem to a base station
while not lte.isattached():
    time.sleep(0.25)
lte.connect()       # start a data session and obtain an IP address
while not lte.isconnected():
    time.sleep(0.25)

s = socket.socket()
s = ssl.wrap_socket(s)
s.connect(socket.getaddrinfo('www.google.com', 443)[0][-1])
s.send(b"GET / HTTP/1.0\r\n\r\n")
print(s.recv(4096))
s.close()

lte.disconnect()
lte.dettach()
