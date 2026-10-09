"""Decode fixed-timestamp and compatibility videos with independent FFmpeg."""
import json,subprocess,hashlib
from pathlib import Path
results=[]
for name,seconds in [('fixed-10s',10),('compatible',6)]:
    path=Path('artifacts/v74/media-'+name+'/boxstudio-animation.webm')
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-count_frames','-show_entries','stream=codec_name,width,height,nb_read_frames:format=duration','-of','json',str(path)]));stream=probe['streams'][0]
    assert stream['codec_name'] in ['vp8','vp9'] and (stream['width'],stream['height'])==(1280,960),probe
    duration=float(probe['format']['duration'])
    if name=='fixed-10s':assert int(stream['nb_read_frames'])==120 and abs(duration-10)<.01,probe
    else:assert int(stream['nb_read_frames'])>=24 and 5.9<=duration<=8,probe
    hashes=[]
    for t in [0,seconds/2,seconds-.5]:
        data=subprocess.check_output(['ffmpeg','-v','error','-ss',str(t),'-i',str(path),'-frames:v','1','-f','image2pipe','-vcodec','png','-threads','1','-'])
        assert len(data)>2000,(name,t);hashes.append(hashlib.sha256(data).hexdigest())
    assert len(set(hashes))==3,(name,'Static or missing frames')
    results.append(dict(name=name,probe=probe,changing_frames=True));print('PASS',name,stream['nb_read_frames'],'frames;',duration,'seconds')
Path('artifacts/v74/media-independent.json').write_text(json.dumps(results,indent=2))
