import aiohttp
import asyncio
import uvicorn
from base64 import b64decode
from fastai import *
from fastai.vision import *
from io import BytesIO
from starlette.applications import Starlette
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import HTMLResponse, JSONResponse, FileResponse
from starlette.staticfiles import StaticFiles

path = Path(__file__).parent
export_file_name = 'model.pkl'
learn = load_learner(path, export_file_name)

app = Starlette()
app.add_middleware(CORSMiddleware, allow_origins=['*'], allow_headers=['X-Requested-With', 'Content-Type'])
app.mount('/assets', StaticFiles(directory='app/assets'))

def Predict(imageList, count):
    results = []
    for img in imageList:
        _,_,outputs = learn.predict(img)
        percentages = [float(i) for i in outputs]
        results.append(percentages)
    
    averages = np.mean(results, axis=0)
    percentages = [ int(i * 100) for i in averages]
    values = sorted(set(zip(learn.data.classes, percentages)), key = lambda d: d[1], reverse=True)[:count]
    #total = sum(int(v) for n,v in values)
    #values.append(("other", float(100 - total)))
    return values

@app.route('/')
async def homepage(request):
    file = path / 'assets' / 'views' / 'index.html'
    return HTMLResponse(file.open().read())

@app.route('/sw.js')
async def homepage(request):
    file = path / 'assets' / 'js' / 'sw.js'
    return FileResponse(str(file))

@app.route('/analyze', methods=['POST'])
async def analyze(request):
    content = await request.json()
    images = []
    for data_uri in content[:9]:
        header, encoded = data_uri.split(",", 1)
        data = b64decode(encoded)
        i = open_image(BytesIO(data))
        images.append(i)
    
    results = Predict(images, 3)
    return JSONResponse(results)

if __name__ == '__main__':
    if 'serve' in sys.argv:
        uvicorn.run(app=app, host='0.0.0.0', port=5000, log_level="info")

