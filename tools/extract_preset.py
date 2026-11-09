# tools/extract_preset.py
import sys
import zipfile
import json
import os

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({'error': 'usage: python extract_preset.py <preset_path> <dest_dir>'}))
        sys.exit(1)

    preset_path = sys.argv[1]
    dest_dir = sys.argv[2]

    os.makedirs(dest_dir, exist_ok=True)

    with zipfile.ZipFile(preset_path, 'r') as zf:
        entries = []
        for idx, info in enumerate(zf.infolist()):
            entries.append({
                'index': idx,
                'filename': info.filename,
                'file_size': info.file_size,
                'compress_size': info.compress_size,
                'compress_type': 'deflate' if info.compress_type == zipfile.ZIP_DEFLATED else 'store',
                'CRC': info.CRC,
                'date_time': list(info.date_time)
            })

        zf.extractall(dest_dir)

        namelist = zf.namelist()
        root_json = 'komponent.json' if 'komponent.json' in namelist else 'preset.json'

    print(json.dumps({'entries': entries, 'root_file': root_json}))
