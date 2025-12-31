# de-on-tap-5 — JSXGraph preset guide

This folder is a **test exam** that demonstrates how to embed JSXGraph diagrams inside `exam.json` and `answers.json`.

## 1) Embed a diagram
Put this HTML inside any question text (`stem`, `question_text`) or inside a solution string:

```html
<div class="jxg-diagram" data-jxg="...spec..."></div>
```

- The renderer (`assets/js/diagrams.js`) finds `.jxg-diagram[data-jxg]` and renders it.
- `data-jxg` can be:
  - **DSL:** `key=value;key2=value2` (recommended)
  - **JSON:** for complex figures (`preset=scene`)

## 2) Common options (work for all presets)

- `bbox=left,top,right,bottom` (default `-5,5,5,-5`)
- `height=240` (px), `width=100%` or `width=420`
- `axes=true|false` (default `true`)
- `grid=true|false` (default `false`)
- `mode=interactive|static`
- (interactive only) `pan=true`, `zoom=true`, `zoomWheel=true`

## 3) Presets (DSL)

### 3.1 `preset=axes`
```html
<div class="jxg-diagram" data-jxg="preset=axes;bbox=-5,5,5,-5;height=220;grid=true"></div>
```

### 3.2 `preset=line`
- By slope-intercept: `m=...;b=...`
- Or 2 points: `p1=x1,y1;p2=x2,y2`
- Segment: add `kind=segment`

```html
<div class="jxg-diagram" data-jxg="preset=line;m=2;b=1;bbox=-5,5,5,-5;height=220;grid=true"></div>
```

### 3.3 `preset=parabola`
- Standard: `a=...;b=...;c=...`
- Vertex: `a=...;h=...;k=...`
- `showVertex=true`

```html
<div class="jxg-diagram" data-jxg="preset=parabola;a=1;b=-2;c=-3;bbox=-6,6,6,-6;height=240;grid=true;showVertex=true"></div>
```

### 3.4 `preset=function`
```html
<div class="jxg-diagram" data-jxg="preset=function;expr=sin(x);bbox=-7,3,7,-3;height=240;grid=true"></div>
```

### 3.5 `preset=triangle`
```html
<div class="jxg-diagram" data-jxg="preset=triangle;A=0,0;B=6,0;C=2,4;bbox=-1,5,7,-1;height=240;grid=true"></div>
```

### 3.6 `preset=circle`
- Radius: `center=x,y;r=3`
- Or through-point: `center=x,y;through=x,y`

```html
<div class="jxg-diagram" data-jxg="preset=circle;center=0,0;r=3;bbox=-5,5,5,-5;height=240;grid=true"></div>
```

## 4) Advanced: `preset=scene` (JSON)
Use this when you need to draw **composite figures** (like GeoGebra exports): points, segments, polygons, circles.

```html
<div class="jxg-diagram" data-jxg='{"preset":"scene","bbox":[-5,5,5,-5],"axes":true,"points":{"A":{"xy":[0,0],"name":"A"}},"segments":[{"p1":"A","p2":[2,1]}]}'></div>
```

Notes:
- JSON is easiest to embed using **single quotes** around `data-jxg='...json...'`.
- Inside `exam.json`/`answers.json` strings, remember to escape `"` as needed.
