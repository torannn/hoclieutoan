/* =========================================================
 * Preset registry — metadata for exam-editor diagram gallery
 * Categories: "Cơ bản", "Đại số", "Hình học", "Ứng dụng"
 * ========================================================= */
(function () {
  'use strict';

  window.PRESETS = [
    // ============ CƠ BẢN ============
    {
      id: 'axes',
      title: 'Hệ trục toạ độ Oxy',
      desc: 'Hệ trục với ticks, nhãn trục. Dùng làm nền cho diagram khác.',
      category: 'Cơ bản',
      tags: ['trục', 'oxy'],
      sample: { preset: 'axes', bbox: [-5, 5, 5, -5], grid: true, height: 200 },
      fields: []
    },
    {
      id: 'parabola',
      title: 'Parabola y = ax² + bx + c',
      desc: 'Đồ thị parabol. Nhập (a,b,c) hoặc dạng đỉnh (a,h,k). Hiện đỉnh, giao trục.',
      category: 'Cơ bản',
      tags: ['parabol', 'đồ thị', 'hàm bậc 2'],
      sample: { preset: 'parabola', a: -1, h: 2, k: 1, showVertex: true, bbox: [-1.5, 2.5, 5, -4.5], grid: true, height: 220 },
      fields: [
        { key: 'a', label: 'a (hệ số bậc 2)', type: 'number', default: 1 },
        { key: 'b', label: 'b', type: 'number', hint: '(dạng chuẩn)' },
        { key: 'c', label: 'c', type: 'number', hint: '(dạng chuẩn)' },
        { key: 'h', label: 'h (toạ độ đỉnh x)', type: 'number', hint: '(dạng đỉnh)' },
        { key: 'k', label: 'k (toạ độ đỉnh y)', type: 'number', hint: '(dạng đỉnh)' },
        { key: 'showVertex', label: 'Hiện đỉnh + nét đứt toạ độ đỉnh', type: 'bool', default: true },
        { key: 'color', label: 'Màu đồ thị', type: 'text', default: '#2563eb' }
      ]
    },
    {
      id: 'function',
      title: 'Đồ thị hàm f(x)',
      desc: 'Vẽ một/nhiều đồ thị hàm số từ biểu thức. Hỗ trợ miền xác định.',
      category: 'Cơ bản',
      tags: ['hàm số', 'đồ thị', 'f(x)'],
      sample: {
        preset: 'function', bbox: [-4, 4, 4, -4], grid: true, height: 220,
        functions: [{ expr: 'sin(x)', color: '#2563eb', label: 'y=sin x' }]
      },
      fields: [
        { key: 'functions', label: 'Danh sách hàm', type: 'json', hint: '[{"expr":"x^2","color":"#2563eb","label":"","domain":[-3,3]}, ...]', default: '[{"expr":"sin(x)","color":"#2563eb"}]' }
      ]
    },
    {
      id: 'line',
      title: 'Đường thẳng y = mx + b',
      desc: 'Vẽ đường thẳng qua 2 điểm hoặc theo hệ số góc + y-intercept.',
      category: 'Cơ bản',
      tags: ['đường thẳng', 'linear'],
      sample: { preset: 'line', m: 1, b: 0, bbox: [-5, 5, 5, -5], grid: true, height: 200 },
      fields: [
        { key: 'm', label: 'm (hệ số góc)', type: 'number', default: 1 },
        { key: 'b', label: 'b (y-intercept)', type: 'number', default: 0 },
        { key: 'p1', label: 'Điểm P₁ (thay cho m,b)', type: 'json', hint: '[x,y]', default: '' },
        { key: 'p2', label: 'Điểm P₂', type: 'json', hint: '[x,y]', default: '' },
        { key: 'color', label: 'Màu', type: 'text', default: '#2563eb' }
      ]
    },
    {
      id: 'circle',
      title: 'Đường tròn',
      desc: 'Đường tròn tâm (cx,cy) bán kính r, hoặc qua 1 điểm.',
      category: 'Cơ bản',
      tags: ['đường tròn', 'circle'],
      sample: { preset: 'circle', center: [0, 0], r: 3, bbox: [-5, 5, 5, -5], grid: true, height: 220 },
      fields: [
        { key: 'center', label: 'Tâm [cx, cy]', type: 'json', default: '[0,0]' },
        { key: 'r', label: 'Bán kính r', type: 'number', default: 3 },
        { key: 'through', label: 'Hoặc điểm đi qua [x,y]', type: 'json', hint: 'thay cho r', default: '' },
        { key: 'showCenter', label: 'Hiện tâm', type: 'bool', default: true },
        { key: 'color', label: 'Màu', type: 'text', default: '#2563eb' }
      ]
    },
    {
      id: 'triangle',
      title: 'Tam giác ABC',
      desc: 'Tam giác với 3 đỉnh cố định, tô màu, hiện cạnh, chú thích.',
      category: 'Hình học',
      tags: ['tam giác', 'hình học'],
      sample: { preset: 'triangle', A: [0, 0], B: [4, 0], C: [1, 3], bbox: [-1, 4, 5, -1], height: 220 },
      fields: [
        { key: 'A', label: 'Đỉnh A', type: 'json', default: '[0,0]' },
        { key: 'B', label: 'Đỉnh B', type: 'json', default: '[4,0]' },
        { key: 'C', label: 'Đỉnh C', type: 'json', default: '[1,3]' },
        { key: 'color', label: 'Màu viền', type: 'text', default: '#0f172a' },
        { key: 'fillColor', label: 'Màu tô', type: 'text', default: '#dbeafe' }
      ]
    },

    // ============ ĐẠI SỐ ============
    {
      id: 'quadraticCompareAB',
      title: 'So sánh f(α) và f(β)',
      desc: 'Parabol bậc 2 với hai điểm α, β được đánh dấu + nét chiếu, dùng để minh hoạ so sánh f(α) & f(β).',
      category: 'Đại số',
      tags: ['parabol', 'so sánh', 'giá trị'],
      sample: { preset: 'quadraticCompareAB', a: 1, b: -4, c: 3, alpha: 0.5, beta: 3.5, bbox: [-1, 4, 5, -2], grid: true, height: 240 },
      fields: [
        { key: 'a', label: 'a', type: 'number', default: 1 },
        { key: 'b', label: 'b', type: 'number', default: -4 },
        { key: 'c', label: 'c', type: 'number', default: 3 },
        { key: 'alpha', label: 'α', type: 'number' },
        { key: 'beta', label: 'β', type: 'number' }
      ]
    },
    {
      id: 'inequalityRegion',
      title: 'Miền nghiệm bất phương trình',
      desc: 'Tô miền nghiệm của hệ BPT bậc nhất, tìm cực trị hàm tuyến tính.',
      category: 'Đại số',
      tags: ['bất phương trình', 'miền nghiệm', 'linear programming'],
      sample: {
        preset: 'inequalityRegion', bbox: [-1, 6, 6, -1], grid: true, height: 260,
        constraints: [
          { expr: 'x+y<=5', color: '#2563eb' },
          { expr: 'x>=0', color: '#16a34a' },
          { expr: 'y>=0', color: '#dc2626' }
        ]
      },
      fields: [
        { key: 'constraints', label: 'Hệ ràng buộc', type: 'json', hint: '[{"expr":"x+y<=5"}, ...]', default: '[{"expr":"x+y<=5"}]' },
        { key: 'objective', label: 'Hàm mục tiêu (tuỳ chọn)', type: 'text', hint: 'ví dụ: 2x+3y', default: '' }
      ]
    },
    {
      id: 'signTable',
      title: 'Bảng xét dấu (auto)',
      desc: 'Bảng xét dấu cho đa thức / hàm phân thức. Tự tìm nghiệm bằng closed-form/Durand–Kerner (đa thức deg ≤ 8, tức thì) hoặc SymPy (Pyodide) cho hàm khác.',
      category: 'Đại số',
      tags: ['xét dấu', 'bảng', 'đa thức', 'phân thức'],
      sample: {
        preset: 'signTable',
        auto: true,
        expressions: [{ expr: 'x^2 - 4*x + 3', label: 'f(x)' }],
        variable: 'x', height: 220
      },
      fields: [
        { key: 'auto', label: 'Tự động tính nghiệm', type: 'boolean', default: true },
        { key: 'expressions', label: 'Biểu thức (mỗi entry 1 nhân tử)', type: 'json', hint: '[{"expr":"x-1"},{"expr":"x+2","forbidden":false}]', default: '[{"expr":"x^2-4*x+3","label":"f(x)"}]' },
        { key: 'variable', label: 'Biến', type: 'text', default: 'x' },
        { key: 'engine', label: 'Engine (auto|sympy)', type: 'text', hint: 'Bỏ trống để dùng closed-form + bisection; \'sympy\' để ép dùng SymPy.', default: '' }
      ]
    },
    {
      id: 'variationTable',
      title: 'Bảng biến thiên (auto f→f\')',
      desc: 'Nhập hàm f, tự động tính f\', tìm nghiệm của f\' và dựng bảng biến thiên. Đa thức & phân thức tính thuần JS; các hàm khác dùng SymPy.',
      category: 'Đại số',
      tags: ['bảng biến thiên', 'đạo hàm', 'BBT'],
      sample: {
        preset: 'signTable',
        kind: 'variation',
        auto: true,
        autoAllowVariation: true,
        f: 'x^3 - 3*x + 2',
        variable: 'x',
        height: 260
      },
      fields: [
        { key: 'f', label: 'Hàm f(x)', type: 'text', hint: 'vd: x^3 - 3*x + 2  hoặc  (x^2+1)/(x-1)', default: 'x^3 - 3*x + 2' },
        { key: 'variable', label: 'Biến', type: 'text', default: 'x' },
        { key: 'auto', label: 'Auto-compute', type: 'boolean', default: true },
        { key: 'autoAllowVariation', label: 'Cho phép dòng biến thiên', type: 'boolean', default: true },
        { key: 'derivativeFactors', label: 'f\' factors (để trống → auto)', type: 'json', hint: '[{"expr":"3*x^2-3","label":"f\'(x)"}]', default: '[]' },
        { key: 'forbiddenValues', label: 'Các x bị loại (rỗng → auto từ mẫu số)', type: 'json', default: '[]' },
        { key: 'showDerivativeFactors', label: 'Hiện các nhân tử của f\'', type: 'boolean', default: false },
        { key: 'intervalMin', label: 'Min x (∞ nếu bỏ trống)', type: 'text', default: '' },
        { key: 'intervalMax', label: 'Max x (∞ nếu bỏ trống)', type: 'text', default: '' },
        { key: 'engine', label: 'Engine (auto|sympy)', type: 'text', default: '' }
      ]
    },

    // ============ HÌNH HỌC ============
    {
      id: 'scene',
      title: 'Scene (tổng hợp)',
      desc: 'Vẽ tự do: đặt điểm, nối đoạn, tô đa giác, vẽ đường tròn. Dùng khi không có preset chuyên dụng.',
      category: 'Hình học',
      tags: ['scene', 'tổng hợp', 'custom'],
      sample: {
        preset: 'scene', bbox: [-1, 5, 6, -1], height: 240,
        points: { A: [0, 0], B: [4, 0], C: [2, 3] },
        polygons: [{ points: ['A', 'B', 'C'], fill: '#dbeafe' }],
        segments: [{ from: 'A', to: 'C', color: '#2563eb' }]
      },
      fields: [
        { key: 'points', label: 'Điểm (map id→[x,y])', type: 'json', default: '{"A":[0,0],"B":[4,0],"C":[2,3]}' },
        { key: 'segments', label: 'Đoạn thẳng', type: 'json', hint: '[{"from":"A","to":"B","color":"#...","dash":2}]', default: '[]' },
        { key: 'polygons', label: 'Đa giác', type: 'json', hint: '[{"points":["A","B","C"],"fill":"#..."}]', default: '[]' },
        { key: 'circles', label: 'Đường tròn', type: 'json', hint: '[{"center":"A","through":"B"}]', default: '[]' }
      ]
    },
    {
      id: 'geometry',
      title: 'Hình học tổng hợp (constructions)',
      desc: 'Dựng hình: trung tuyến, đường cao, phân giác, trung trực… từ điểm cơ bản.',
      category: 'Hình học',
      tags: ['dựng hình', 'trung tuyến', 'đường cao'],
      sample: {
        preset: 'geometry', bbox: [-1, 5, 6, -1], height: 240,
        points: { A: [0, 0], B: [4, 0], C: [2, 3] },
        draws: [{ type: 'polygon', points: ['A', 'B', 'C'], color: '#0f172a' }]
      },
      fields: [
        { key: 'points', label: 'Điểm', type: 'json', default: '{"A":[0,0],"B":[4,0],"C":[2,3]}' },
        { key: 'draws', label: 'Cấu trúc draws', type: 'json', default: '[{"type":"polygon","points":["A","B","C"]}]' }
      ]
    },
    {
      id: 'semicircleRectangle',
      title: 'Nửa đường tròn + HCN nội tiếp',
      desc: 'Nửa đường tròn đường kính MN, hình chữ nhật ABCD nội tiếp đối xứng qua tâm.',
      category: 'Hình học',
      tags: ['nửa đường tròn', 'hình chữ nhật', 'nội tiếp'],
      sample: { preset: 'semicircleRectangle', R: 5, a: 4.8, bbox: [-6, 6, 6, -1.5], height: 240 },
      fields: [
        { key: 'R', label: 'Bán kính R', type: 'number', default: 5 },
        { key: 'a', label: '|IA| (nửa đáy hình chữ nhật)', type: 'number', default: 4.8 },
        { key: 'showDiagonal', label: 'Hiện đường chéo BD', type: 'bool', default: true },
        { key: 'showCenterLine', label: 'Nét đứt B→I (tâm)', type: 'bool', default: true },
        { key: 'showLabels', label: 'Hiện nhãn M/A/I/D/N/B/C', type: 'bool', default: true },
        { key: 'showRectFill', label: 'Tô nhẹ hình chữ nhật', type: 'bool', default: false }
      ]
    },

    // ============ ỨNG DỤNG THỰC TẾ ============
    {
      id: 'roadParabolaDrainage',
      title: 'Mặt cắt đường (parabol)',
      desc: 'Mặt cắt đường nhân tạo dạng parabol có rãnh thoát nước.',
      category: 'Ứng dụng',
      tags: ['đường', 'parabol', 'thoát nước'],
      sample: { preset: 'roadParabolaDrainage', width: 10, height_road: 0.25, height: 220 },
      fields: [
        { key: 'width', label: 'Bề rộng đường (m)', type: 'number', default: 10 },
        { key: 'height_road', label: 'Chiều cao đỉnh (m)', type: 'number', default: 0.25 }
      ]
    },
    {
      id: 'parabolicReflector',
      title: 'Chụp đèn parabol',
      desc: 'Mặt cắt qua trục của chụp đèn parabol + tia sáng phản xạ từ tiêu điểm.',
      category: 'Ứng dụng',
      tags: ['đèn', 'parabol', 'tiêu điểm', 'phản xạ'],
      sample: { preset: 'parabolicReflector', depth: 15, mouthDiameter: 20, bbox: [-4, 15, 26, -16], height: 280 },
      fields: [
        { key: 'depth', label: 'Độ sâu đèn (cm)', type: 'number', default: 15 },
        { key: 'mouthDiameter', label: 'Đường kính miệng (cm)', type: 'number', default: 20 },
        { key: 'showRays', label: 'Hiện tia phản xạ', type: 'bool', default: true },
        { key: 'showFocus', label: 'Hiện tiêu điểm F', type: 'bool', default: true },
        { key: 'showMeasurements', label: 'Hiện nhãn kích thước', type: 'bool', default: true },
        { key: 'showFilamentBox', label: 'Khung dây tóc', type: 'bool', default: true }
      ]
    },
    {
      id: 'satelliteDish',
      title: 'Ăng ten vệ tinh',
      desc: 'Hình ăng ten vệ tinh kiểu TikZ với chân đỡ, chảo quay và nhãn kích thước.',
      category: 'Ứng dụng',
      tags: ['ăng ten', 'parabol', 'vệ tinh', 'tikz'],
      sample: { preset: 'satelliteDish', mouthDiameter: 300, focusDistance: 75, bbox: [-5, 9, 8, -5], height: 340 },
      fields: [
        { key: 'mouthDiameter', label: 'Đường kính miệng (cm)', type: 'number', default: 300 },
        { key: 'focusDistance', label: 'Khoảng cách OF cần hỏi (cm)', type: 'number', default: 75 },
        { key: 'mouthGapLabel', label: 'Nhãn khoảng cách đầu thu-miệng', type: 'text', default: '150 cm' },
        { key: 'rotationDeg', label: 'Góc quay chảo (độ)', type: 'number', default: 35 }
      ]
    },
    {
      id: 'multiGraph',
      title: 'Mạng đồ thị (nhiều cạnh)',
      desc: 'Các đỉnh nối với nhau bằng nhiều cạnh song song. Dùng cho bài đếm đường đi.',
      category: 'Ứng dụng',
      tags: ['đồ thị', 'quy tắc nhân', 'đếm'],
      sample: {
        preset: 'multiGraph', bbox: [-1.5, 2.8, 16.5, -2.8], height: 200, keepAspectRatio: false,
        nodes: { A: [0, 0], B: [5, 0], C: [10, 0], D: [15, 0] },
        edges: [
          { from: 'A', to: 'B', count: 3 },
          { from: 'B', to: 'C', count: 4 },
          { from: 'C', to: 'D', count: 2 }
        ],
        amplitude: 1.3, nodeRadius: 0.7
      },
      fields: [
        { key: 'nodes', label: 'Đỉnh (map id→[x,y])', type: 'json', default: '{"A":[0,0],"B":[5,0]}' },
        { key: 'edges', label: 'Các cạnh', type: 'json', hint: '[{"from":"A","to":"B","count":3}]', default: '[{"from":"A","to":"B","count":2}]' },
        { key: 'amplitude', label: 'Biên độ uốn cong', type: 'number', default: 1.3 },
        { key: 'nodeRadius', label: 'Bán kính đỉnh', type: 'number', default: 0.7 }
      ]
    },
    {
      id: 'lawnMower',
      title: 'Lực kéo máy cắt cỏ',
      desc: 'Mô tả vector lực F nghiêng góc θ so với mặt đất.',
      category: 'Ứng dụng',
      tags: ['vector', 'lực', 'vật lý'],
      sample: { preset: 'lawnMower', angleDeg: 50, forceN: 180, distanceM: 30, height: 240 },
      fields: [
        { key: 'angleDeg', label: 'Góc (°)', type: 'number', default: 50 },
        { key: 'forceN', label: 'Lực F (N)', type: 'number', default: 180 },
        { key: 'distanceM', label: 'Quãng đường (m)', type: 'number', default: 30 }
      ]
    },
    {
      id: 'windVectors',
      title: 'Vector gió',
      desc: 'Hai vector gió cộng lại, hoặc máy bay + gió.',
      category: 'Ứng dụng',
      tags: ['vector', 'gió', 'tổng hợp'],
      sample: { preset: 'windVectors', v1: [5, 0], v2: [0, 3], height: 240 },
      fields: [
        { key: 'v1', label: 'Vector 1 [vx, vy]', type: 'json', default: '[5,0]' },
        { key: 'v2', label: 'Vector 2', type: 'json', default: '[0,3]' }
      ]
    },
    {
      id: 'riverCrossing',
      title: 'Qua sông',
      desc: 'Thuyền qua sông với vector vận tốc thuyền + dòng nước.',
      category: 'Ứng dụng',
      tags: ['vector', 'thuyền', 'sông'],
      sample: { preset: 'riverCrossing', boatSpeed: 4, currentSpeed: 2, riverWidth: 6, height: 240 },
      fields: [
        { key: 'boatSpeed', label: 'Vận tốc thuyền', type: 'number', default: 4 },
        { key: 'currentSpeed', label: 'Vận tốc dòng nước', type: 'number', default: 2 },
        { key: 'riverWidth', label: 'Bề rộng sông', type: 'number', default: 6 }
      ]
    },
    {
      id: 'iceCreamCone',
      title: 'Ốc quế + kem (nón + bán cầu)',
      desc: 'Mặt cắt đứng hình nón + bán cầu kem phía trên.',
      category: 'Ứng dụng',
      tags: ['nón', 'bán cầu', 'thể tích'],
      sample: { preset: 'iceCreamCone', R: 2.5, H: 6, height: 260 },
      fields: [
        { key: 'R', label: 'Bán kính miệng R', type: 'number', default: 2.5 },
        { key: 'H', label: 'Chiều cao nón H', type: 'number', default: 6 }
      ]
    },
    {
      id: 'cometTebbutt',
      title: 'Quỹ đạo sao chổi (elip)',
      desc: 'Quỹ đạo elip của sao chổi + Mặt trời tại tiêu điểm.',
      category: 'Ứng dụng',
      tags: ['elip', 'sao chổi', 'thiên văn'],
      sample: { preset: 'cometTebbutt', EC: 100, CS: 130, ES: 60, height: 260 },
      fields: [
        { key: 'EC', label: 'EC', type: 'number' },
        { key: 'CS', label: 'CS', type: 'number' },
        { key: 'ES', label: 'ES', type: 'number' }
      ]
    },
    {
      id: 'photoAnnotate',
      title: 'Chú thích ảnh',
      desc: 'Đè ảnh nền + chú thích điểm/đường lên. Cần URL ảnh.',
      category: 'Ứng dụng',
      tags: ['ảnh', 'annotate', 'chú thích'],
      sample: { preset: 'photoAnnotate', img: 'https://placehold.co/400x300', imgW: 400, imgH: 300, height: 260 },
      fields: [
        { key: 'img', label: 'URL ảnh', type: 'text' },
        { key: 'imgW', label: 'Chiều rộng ảnh (px)', type: 'number', default: 400 },
        { key: 'imgH', label: 'Chiều cao ảnh (px)', type: 'number', default: 300 },
        { key: 'points', label: 'Điểm chú thích', type: 'json', default: '{}' }
      ]
    }
  ];
})();
