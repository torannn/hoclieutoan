# de-on-tap-5 — JSXGraph assets authoring guide (for AI)

This folder is a **test exam** that demonstrates how to embed JSXGraph diagrams inside `exam.json` and `answers.json`.

This README is written so an AI (or a human author) can reliably generate new diagrams without touching JavaScript.

## 1) How embedding works

Put this HTML inside any question text (`stem`, `question_text`) or inside a solution string:

```html
<div class="jxg-diagram" data-jxg="...spec..."></div>
```

The renderer (`assets/js/diagrams.js`) finds `.jxg-diagram[data-jxg]` and renders it.

## 2) `data-jxg` formats

You can provide the spec in **two formats**:

### 2.1 DSL (recommended for most presets)

The DSL is a semicolon-separated `key=value` list:

```html
<div class="jxg-diagram" data-jxg="preset=line;m=2;b=1;bbox=-5,5,5,-5;height=220;grid=true"></div>
```

### 2.2 JSON (recommended for complex scenes)

Use JSON when the spec is nested/complex (e.g. `preset=scene`, sign/variation tables, etc.).

```html
<div class="jxg-diagram" data-jxg='{"preset":"scene","bbox":[-5,5,5,-5],"axes":true,"points":{"A":{"xy":[0,0],"name":"A"}}}'></div>
```

Important:

- **In HTML**, it’s easiest to wrap JSON with **single quotes**: `data-jxg='...json...'`.
- **Inside `exam.json` / `answers.json` strings**, remember to escape inner quotes: `\"`.

## 3) Common options (work for all presets)

- **`bbox`**: `left,top,right,bottom` (default `-5,5,5,-5`)
- **`height`**: pixels (e.g. `240`)
- **`width`**: `100%` or a number (e.g. `420`)
- **`axes`**: `true|false` (default `true`)
- **`grid`**: `true|false` (default `false`)
- **`mode`**: `interactive|static`
- **(interactive only)** `pan=true`, `zoom=true`, `zoomWheel=true`

## 4) Quick preset examples (DSL)

### 4.1 `preset=axes`

```html
<div class="jxg-diagram" data-jxg="preset=axes;bbox=-5,5,5,-5;height=220;grid=true"></div>
```

### 4.2 `preset=line`

Options:

- `m=...;b=...` (slope-intercept)
- `p1=x1,y1;p2=x2,y2` (two points)
- add `kind=segment` for a segment

```html
<div class="jxg-diagram" data-jxg="preset=line;m=2;b=1;bbox=-5,5,5,-5;height=220;grid=true"></div>
```

### 4.3 `preset=parabola`

- Standard: `a=...;b=...;c=...`
- Vertex form: `a=...;h=...;k=...`
- `showVertex=true`

```html
<div class="jxg-diagram" data-jxg="preset=parabola;a=1;b=-2;c=-3;bbox=-6,6,6,-6;height=240;grid=true;showVertex=true"></div>
```

### 4.4 `preset=function`

```html
<div class="jxg-diagram" data-jxg="preset=function;expr=sin(x);bbox=-7,3,7,-3;height=240;grid=true"></div>
```

### 4.5 `preset=triangle`

```html
<div class="jxg-diagram" data-jxg="preset=triangle;A=0,0;B=6,0;C=2,4;bbox=-1,5,7,-1;height=240;grid=true"></div>
```

### 4.6 `preset=circle`

- Radius form: `center=x,y;r=3`
- Through-point form: `center=x,y;through=x,y`

```html
<div class="jxg-diagram" data-jxg="preset=circle;center=0,0;r=3;bbox=-5,5,5,-5;height=240;grid=true"></div>
```

## 5) Advanced: `preset=scene` (JSON)

Use this for composite figures (GeoGebra-style exports): points, segments, polygons, circles.

```html
<div class="jxg-diagram" data-jxg='{
  "preset":"scene",
  "bbox":[-5,5,5,-5],
  "axes":true,
  "points":{
    "A":{"xy":[0,0],"name":"A"},
    "B":{"xy":[2,1],"name":"B"}
  },
  "segments":[{"p1":"A","p2":"B"}]
}'></div>
```

## 6) Tables: `preset=signTable` (sign tables + variation tables)

The same preset name is used for:

- **Sign tables** (`kind` omitted)
- **Variation tables** (`kind:"variation"`)

### 6.1 Automatic sign table (OK to use)

Set `auto:true` and provide `expressions`.

Each expression can be:

- a string: `"x-1"`
- an object: `{ "expr":"x+3", "label":"x+3", "forbidden":true }`

Example (JSON inside HTML):

```html
<div class="jxg-diagram" data-jxg='{
  "preset":"signTable",
  "axes":false,
  "auto":true,
  "variable":"x",
  "expressions":[
    "x-1",
    "x+2"
  ],
  "bbox":[-0.5,2,8,-3],
  "height":240
}'></div>
```

### 6.2 Variation table (manual / TKZ-like) — recommended

**Automatic variation tables are archived/disabled by default.**

To create a variation table, use:

- `preset:"signTable"`
- `kind:"variation"`
- `xValues`: header labels (strings)
- optional `derivative`: a sign row specification
- `tkzTabVar`: TKZ-like variation row tokens

#### 6.2.1 Minimal manual variation table

```html
<div class="jxg-diagram" data-jxg='{
  "preset":"signTable",
  "axes":false,
  "kind":"variation",
  "variable":"x",
  "xValues":["-\\infty","2","+\\infty"],
  "derivative":{
    "label":"f\u0027(x)",
    "intervalSigns":["-","+"],
    "pointMarks":{"1":"0"}
  },
  "tkzTabVar":"+/+\\infty, -/-1, +/+\\infty",
  "bbox":[-0.5,2,8,-3],
  "height":240
}'></div>
```

#### 6.2.2 `tkzTabVar` token cheat-sheet (supported subset)

`tkzTabVar` is a comma-separated list of **N elements**, where N = `xValues.length`.

Each element is roughly `SYMBOL / EXPR` or `SYMBOL / EXPR_LEFT / EXPR_RIGHT`.

- **`+/expr`**
  - place `expr` at the breakpoint.
  - `+` means the arrow endpoint uses the **top** position.
- **`-/expr`**
  - place `expr` at the breakpoint.
  - `-` means the arrow endpoint uses the **bottom** position.
- **Discontinuity with two-sided limits**: `-D+/left/right`, `+D-/left/right`, etc.
  - Example: `-D+/-\\infty/+\\infty`
  - Renders a **double vertical bar** at that breakpoint and prints `left` and `right` values on the left/right side.

Notes:

- The renderer uses the TKZ signs to decide arrow endpoints between columns.
- This implementation intentionally focuses on **manual authoring** (no CAS/SymPy required).

### 6.3 Archived automatic variation table (opt-in only)

If you really want the old automatic pipeline (SymPy/numeric), you must explicitly opt in:

- `auto:true`
- `kind:"variation"`
- `allowAutoVariation:true`

Example (not recommended long-term):

```html
<div class="jxg-diagram" data-jxg='{
  "preset":"signTable",
  "axes":false,
  "auto":true,
  "allowAutoVariation":true,
  "kind":"variation",
  "engine":"sympy",
  "variable":"x",
  "f":"x^2-4*x+3",
  "derivativeFactors":["2*x-4"],
  "bbox":[-0.5,2,8,-3],
  "height":240
}'></div>
```

## 7) Where to add these specs

- **Question text**: `data/grade10/de-on-tap-5/exam.json` under `questions[*].stem`
- **Solutions**: `data/grade10/de-on-tap-5/answers.json` values (HTML string)
