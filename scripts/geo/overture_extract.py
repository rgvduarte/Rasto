"""Extrai um tema/tipo do Overture Maps para a área de Serpa, com leituras HTTP parciais dos Parquet
(não precisa de DuckDB nem de credenciais AWS).

Uso: python3 overture_extract.py theme=transportation/type=segment .geo-cache/overture/segments.parquet id,geometry,bbox,class,names
"""
import sys, re, json, time, urllib.request, urllib.parse
from concurrent.futures import ThreadPoolExecutor
import fsspec, pyarrow as pa, pyarrow.parquet as pq, pyarrow.compute as pc

REL = 'release/2026-09-23.1/'
BUCKET = 'https://overturemaps-us-west-2.s3.amazonaws.com/'
XMIN, YMIN, XMAX, YMAX = -7.80, 37.68, -7.15, 38.24  # um pouco maior que a AOI de common.py

def ls(prefix):
    out, token = [], None
    while True:
        url = BUCKET + f"?list-type=2&prefix={prefix}" + (f"&continuation-token={urllib.parse.quote(token)}" if token else "")
        x = urllib.request.urlopen(url).read().decode()
        out += re.findall(r"<Key>([^<]+\.parquet)</Key>", x)
        m = re.search(r"<NextContinuationToken>([^<]+)</NextContinuationToken>", x)
        if not m: break
        token = m.group(1)
    return out

fs = fsspec.filesystem('https', client_kwargs={'trust_env': True})

def stat_range(md, rg, name):
    rgm = md.row_group(rg)
    for c in range(rgm.num_columns):
        col = rgm.column(c)
        if col.path_in_schema == name:
            s = col.statistics
            if s is None or not s.has_min_max: return None
            return s.min, s.max
    return None

def scan(key, columns):
    url = BUCKET + key
    for attempt in range(4):
        try:
            f = fs.open(url, 'rb', block_size=2**20, cache_type='readahead')
            pf = pq.ParquetFile(f)
            md = pf.metadata
            hits = []
            for rg in range(md.num_row_groups):
                xmin = stat_range(md, rg, 'bbox.xmin'); xmax = stat_range(md, rg, 'bbox.xmax')
                ymin = stat_range(md, rg, 'bbox.ymin'); ymax = stat_range(md, rg, 'bbox.ymax')
                if None in (xmin, xmax, ymin, ymax): hits.append(rg); continue
                # row group covers [xmin.min, xmax.max] x [ymin.min, ymax.max]
                if xmin[0] <= XMAX and xmax[1] >= XMIN and ymin[0] <= YMAX and ymax[1] >= YMIN:
                    hits.append(rg)
            if not hits: return key, None, md.num_row_groups
            names = set(pf.schema_arrow.names)
            cols = [c for c in columns if c in names]
            t = pf.read_row_groups(hits, columns=cols)
            b = t.column('bbox')
            mask = pc.and_(pc.and_(pc.less_equal(pc.struct_field(b, 'xmin'), XMAX), pc.greater_equal(pc.struct_field(b, 'xmax'), XMIN)),
                           pc.and_(pc.less_equal(pc.struct_field(b, 'ymin'), YMAX), pc.greater_equal(pc.struct_field(b, 'ymax'), YMIN)))
            t = t.filter(mask)
            return key, (t if t.num_rows else None), len(hits)
        except Exception as e:
            err = e; time.sleep(2 * (attempt + 1))
    print('FAILED', key, err, flush=True)
    return key, None, -1

if __name__ == '__main__':
    theme_type, out, cols = sys.argv[1], sys.argv[2], sys.argv[3].split(',')
    keys = ls(REL + theme_type + '/')
    print(theme_type, len(keys), 'files', flush=True)
    tables = []
    with ThreadPoolExecutor(8) as ex:
        for i, (key, t, n) in enumerate(ex.map(lambda k: scan(k, cols), keys)):
            if t is not None:
                tables.append(t); print(f'[{i+1}/{len(keys)}] {key.split("/")[-1][:12]} rgs={n} rows={t.num_rows}', flush=True)
    if tables:
        t = pa.concat_tables(tables, promote_options='permissive')
        pq.write_table(t, out)
        print('WROTE', out, t.num_rows, flush=True)
    else:
        print('NO ROWS', flush=True)
