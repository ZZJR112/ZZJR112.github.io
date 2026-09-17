"""生成社交分享卡片 og-image.png（纯标准库，无第三方依赖）。
1200x630，深色底 + 细线网格 + 播放键图形，与站点设计系统一致。
"""
import zlib, struct

W, H = 1200, 630
BG = (10, 10, 11)          # #0A0A0B
LINE = (30, 30, 34)        # #1E1E22
ACCENT = (124, 143, 184)   # #7C8FB8
TEXT = (237, 234, 228)     # #EDEAE4

px = [[BG for _ in range(W)] for _ in range(H)]


def rect(x0, y0, x1, y1, c):
    x0, x1 = max(0, x0), min(W, x1)
    y0, y1 = max(0, y0), min(H, y1)
    for y in range(y0, y1):
        row = px[y]
        for x in range(x0, x1):
            row[x] = c


def disc(cx, cy, r, c, thickness=2):
    for y in range(max(0, cy - r - 2), min(H, cy + r + 3)):
        for x in range(max(0, cx - r - 2), min(W, cx + r + 3)):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            if r - thickness <= d <= r:
                px[y][x] = c


def triangle(cx, cy, size, c):
    # 右向播放三角
    for i in range(size):
        # 每一行从顶点向外扩展
        h = int(i * 0.62)
        for y in range(cy - h, cy + h + 1):
            x = cx - size // 3 + i
            if 0 <= x < W and 0 <= y < H:
                px[y][x] = c


# 背景：顶部略亮的渐变（与 hero 一致）
for y in range(H):
    t = 1 - y / H
    v = int(10 + 8 * t * t)
    if v != 10:
        for x in range(W):
            px[y][x] = (v, v, v + 1)

# 细线网格（呼应站点的 hairline 分隔）
for x in range(120, W, 160):
    rect(x, 0, x + 1, H, LINE)
rect(0, H - 96, W, H - 95, LINE)

# 播放键图形
disc(210, 300, 62, ACCENT, 2)
triangle(216, 300, 52, TEXT)

# 文字块用抽象几何替代（避免字体依赖）：左下角三条长短不一的线
rect(120, 372, 520, 380, TEXT)     # 主标题占位
rect(120, 404, 400, 409, (139, 136, 128))
rect(120, 430, 340, 435, (139, 136, 128))

# 右下角小字占位
rect(W - 300, H - 150, W - 120, H - 146, ACCENT)

raw = b''
for y in range(H):
    raw += b'\x00' + b''.join(struct.pack('BBB', *px[y][x]) for x in range(W))


def chunk(tag, data):
    return (struct.pack('>I', len(data)) + tag + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff))


png = (b'\x89PNG\r\n\x1a\n'
       + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
       + chunk(b'IDAT', zlib.compress(raw, 9))
       + chunk(b'IEND', b''))

with open('og-image.png', 'wb') as f:
    f.write(png)

print('og-image.png', W, 'x', H, len(png), 'bytes')
