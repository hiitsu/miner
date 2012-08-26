miner
=====

Tiny dumb jquery selector based recursive web miner. It does not run scripts, works on the static html content received
which might reduce the usefulness.

examples
=====

To save all JPGs from front page' img tags:
node miner.js --url=http://www.hs.fi/
or not using defaults:
node miner.js --url=http://www.hs.fi/ --recurse=0 --tag=img --attr=src --extension=jpg --reset=true

To save all JPGs from front page and linked page.
node miner.js --url=http://www.imdb.com/ --recurse=2

To save all MP3 files from front page and any link or link's link one it.
node miner.js --url=http://www.imdb.com/ --recurse=2 --tag=a --attr=href --extension=mp3

To not reset data directory on every run use --reset=false