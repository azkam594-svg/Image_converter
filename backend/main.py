import sys
import os
import subprocess

# Self-installation of dependencies if missing
REQUIRED_PACKAGES = {
    "fastapi": "fastapi",
    "uvicorn": "uvicorn",
    "PIL": "pillow",
    "multipart": "python-multipart"
}

for module_name, pip_name in REQUIRED_PACKAGES.items():
    try:
        __import__(module_name)
    except ImportError:
        print(f"Installing missing dependency: {pip_name}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", pip_name])

# Now import the installed packages safely
import uuid
import shutil
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from typing import Optional

app = FastAPI(title="Image Converter API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONVERTED_DIR = os.path.join(BASE_DIR, "converted_files")
os.makedirs(CONVERTED_DIR, exist_ok=True)

# Format mapping
FORMAT_MAPPING = {
    "jpg": "JPEG",
    "jpeg": "JPEG",
    "png": "PNG",
    "webp": "WEBP",
    "bmp": "BMP",
    "tiff": "TIFF",
    "gif": "GIF"
}

# Content type mapping
CONTENT_TYPE_MAPPING = {
    "JPEG": "image/jpeg",
    "PNG": "image/png",
    "WEBP": "image/webp",
    "BMP": "image/bmp",
    "TIFF": "image/tiff",
    "GIF": "image/gif"
}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Python FastAPI server is healthy"}

@app.post("/api/convert")
async def convert_image(
    image: UploadFile = File(...),
    format: str = Form(...),
    quality: int = Form(90),
    width: Optional[int] = Form(None),
    height: Optional[int] = Form(None)
):
    try:
        # Resolve target format
        target_fmt = FORMAT_MAPPING.get(format.lower())
        if not target_fmt:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")

        # Open the uploaded image
        try:
            img = Image.open(image.file)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid image file: {str(e)}")

        # Handle rotation metadata (EXIF orientation)
        try:
            if hasattr(img, '_getexif') and img._getexif() is not None:
                exif = dict(img._getexif().items())
                # Orientation tag key is usually 274
                orientation = exif.get(274)
                if orientation == 3:
                    img = img.rotate(180, expand=True)
                elif orientation == 6:
                    img = img.rotate(270, expand=True)
                elif orientation == 8:
                    img = img.rotate(90, expand=True)
        except Exception:
            # Silently pass if EXIF parsing fails
            pass

        # Resize image if requested
        if width or height:
            orig_w, orig_h = img.size
            new_w = width if width else orig_w
            new_h = height if height else orig_h
            
            # Determine best resampling filter across Pillow versions
            resample_filter = getattr(Image, "Resampling", None)
            if resample_filter:
                filter_type = resample_filter.LANCZOS
            else:
                filter_type = getattr(Image, "ANTIALIAS", Image.BICUBIC)
                
            img = img.resize((new_w, new_h), filter_type)

        # Handle transparency conversion for formats that do not support transparency
        if img.mode in ("RGBA", "LA") and target_fmt in ("JPEG", "BMP"):
            # Create white background to paste transparent image over
            background = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                background.paste(img, mask=img.split()[3]) # 3 is alpha
            else:
                background.paste(img, mask=img.split()[1]) # 1 is alpha for LA
            img = background
        elif img.mode != "RGB" and target_fmt in ("JPEG", "BMP"):
            img = img.convert("RGB")

        # Create unique file name and path
        file_id = f"{uuid.uuid4()}"
        file_ext = format.lower()
        output_filename = f"{file_id}.{file_ext}"
        output_path = os.path.join(CONVERTED_DIR, output_filename)

        # Save the image
        save_kwargs = {}
        if target_fmt in ("JPEG", "WEBP"):
            save_kwargs["quality"] = max(1, min(100, quality))

        img.save(output_path, target_fmt, **save_kwargs)

        # Build download URL and return response
        download_url = f"/api/download/{output_filename}"
        
        # Get original file name prefix
        original_base, _ = os.path.splitext(image.filename)
        display_filename = f"{original_base}.{file_ext}"

        return {
            "status": "success",
            "downloadUrl": download_url,
            "filename": display_filename
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Conversion failed: {str(e)}")

@app.get("/api/download/{file_name}")
async def download_file(file_name: str, background_tasks: BackgroundTasks):
    file_path = os.path.join(CONVERTED_DIR, file_name)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    # Get media type
    _, ext = os.path.splitext(file_name.lower())
    target_fmt = FORMAT_MAPPING.get(ext.replace(".", ""))
    media_type = CONTENT_TYPE_MAPPING.get(target_fmt, "application/octet-stream")

    # Optionally delete file after a delay to keep disk clean
    # Wait, we can register a background task to delete it or just serve it directly
    return FileResponse(
        path=file_path,
        media_type=media_type,
        filename=file_name
    )

# Serve the static frontend
FRONTEND_DIR = os.path.join(os.path.dirname(BASE_DIR), "frontend")
if os.path.exists(FRONTEND_DIR):
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
else:
    print(f"Warning: Frontend directory not found at {FRONTEND_DIR}")

if __name__ == "__main__":
    import uvicorn
    # Bind to port 3000 as required by the AI Studio platform
    uvicorn.run("main:app", host="0.0.0.0", port=3000, reload=True)
