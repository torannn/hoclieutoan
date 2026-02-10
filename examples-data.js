const EXAMPLES = [
    {
        title: "Ví dụ 1: \\(x^2 + 4x = 5\\)",
        steps: [
            {
                title: "Phương trình ban đầu",
                content: `
                    <p>Giải phương trình:</p>
                    <div class="formula-box">\\[x^2 + 4x = 5\\]</div>
                    <p>Ta sẽ sử dụng phương pháp hoàn thành bình phương để giải.</p>
                `,
                formula: "\\(x^2 + 4x = 5\\)"
            },
            {
                title: "Biểu diễn \\(x^2\\)",
                content: `
                    <p>Vẽ hình vuông cạnh \\(x\\) để biểu diễn \\(x^2\\).</p>
                    <div class="formula-box">Diện tích: \\(x \\times x = x^2\\)</div>
                `,
                formula: "\\(x^2\\)"
            },
            {
                title: "Thêm \\(4x\\)",
                content: `
                    <p>Thêm hình chữ nhật có diện tích \\(4x\\) (màu xanh lá nhạt).</p>
                    <p>Ta chia thành hai phần: mỗi phần có chiều rộng \\(2\\) và chiều dài \\(x\\).</p>
                    <div class="formula-box">\\(x^2 + 4x = x^2 + 2x + 2x\\)</div>
                `,
                formula: "\\(x^2 + 4x\\)"
            },
            {
                title: "Sắp xếp lại",
                content: `
                    <p>Di chuyển một nửa (\\(2x\\)) xuống dưới để tạo hình gần vuông.</p>
                    <p>Bây giờ ta có hình chữ L với các cạnh \\(x\\) và \\(2\\).</p>
                `,
                formula: "\\(x^2 + 4x\\)"
            },
            {
                title: "Hoàn thành bình phương",
                content: `
                    <p>Thêm hình vuông nhỏ \\(2^2 = 4\\) vào góc (màu vàng) để hoàn thành hình vuông lớn.</p>
                    <div class="formula-box">\\[x^2 + 4x + 4 = (x + 2)^2\\]</div>
                    <p>Vế phải của phương trình cũng cần cộng thêm \\(4\\):</p>
                    <div class="formula-box">\\((x + 2)^2 = 5 + 4 = 9\\)</div>
                `,
                formula: "\\((x + 2)^2 = 9\\)"
            },
            {
                title: "Giải phương trình",
                content: `
                    <p>Lấy căn bậc hai hai vế:</p>
                    <div class="formula-box">\\[x + 2 = \\pm 3\\]</div>
                    <p><strong>Nghiệm 1:</strong> \\(x + 2 = 3 \\Rightarrow x = 1\\)</p>
                    <p><strong>Nghiệm 2:</strong> \\(x + 2 = -3 \\Rightarrow x = -5\\)</p>
                    <div class="formula-box" style="background: #d4edda; border-color: #28a745;">
                        <strong>Vậy phương trình có hai nghiệm: \\(x = 1\\) hoặc \\(x = -5\\)</strong>
                    </div>
                `,
                formula: "\\(x = 1\\) hoặc \\(x = -5\\)"
            }
        ],
        visualParams: {
            baseSize: 150,
            addSize: 60,
            startX: 100,
            startY: 40,
            type: 'plus'
        }
    },
    {
        title: "Ví dụ 2: \\(x^2 - 3x = 4\\)",
        steps: [
            {
                title: "Phương trình ban đầu",
                content: `
                    <p>Giải phương trình:</p>
                    <div class="formula-box">\\[x^2 - 3x = 4\\]</div>
                    <p>Phương trình có hệ số âm, ta sẽ cắt bỏ phần diện tích.</p>
                `,
                formula: "\\(x^2 - 3x = 4\\)"
            },
            {
                title: "Biểu diễn \\(x^2\\)",
                content: `
                    <p>Vẽ hình vuông cạnh \\(x\\) để biểu diễn \\(x^2\\).</p>
                    <div class="formula-box">Diện tích: \\(x \\times x = x^2\\)</div>
                `,
                formula: "\\(x^2\\)"
            },
            {
                title: "Trừ đi \\(3x\\)",
                content: `
                    <p>Cắt bỏ hình chữ nhật có diện tích \\(3x\\) (màu đỏ).</p>
                    <p>Chia thành hai phần: mỗi phần có chiều rộng \\(\\frac{3}{2}\\) và chiều dài \\(x\\).</p>
                    <div class="formula-box">\\(x^2 - 3x = x^2 - \\frac{3x}{2} - \\frac{3x}{2}\\)</div>
                `,
                formula: "\\(x^2 - 3x\\)"
            },
            {
                title: "Sắp xếp lại",
                content: `
                    <p>Di chuyển một nửa (\\(\\frac{3x}{2}\\)) xuống dưới.</p>
                    <p>Tạo thành hình chữ L với các cạnh \\(x\\) và \\(\\frac{3}{2}\\).</p>
                `,
                formula: "\\(x^2 - 3x\\)"
            },
            {
                title: "Hoàn thành bình phương",
                content: `
                    <p>Thêm hình vuông nhỏ \\(\\left(\\frac{3}{2}\\right)^2 = \\frac{9}{4} = 2.25\\) vào góc (màu vàng).</p>
                    <div class="formula-box">\\[x^2 - 3x + \\frac{9}{4} = \\left(x - \\frac{3}{2}\\right)^2\\]</div>
                    <p>Vế phải cũng cộng thêm \\(\\frac{9}{4}\\):</p>
                    <div class="formula-box">\\(\\left(x - \\frac{3}{2}\\right)^2 = 4 + \\frac{9}{4} = \\frac{25}{4}\\)</div>
                `,
                formula: "\\(\\left(x - \\frac{3}{2}\\right)^2 = \\frac{25}{4}\\)"
            },
            {
                title: "Giải phương trình",
                content: `
                    <p>Lấy căn bậc hai hai vế:</p>
                    <div class="formula-box">\\[x - \\frac{3}{2} = \\pm \\frac{5}{2}\\]</div>
                    <p><strong>Nghiệm 1:</strong> \\(x - \\frac{3}{2} = \\frac{5}{2} \\Rightarrow x = 4\\)</p>
                    <p><strong>Nghiệm 2:</strong> \\(x - \\frac{3}{2} = -\\frac{5}{2} \\Rightarrow x = -1\\)</p>
                    <div class="formula-box" style="background: #d4edda; border-color: #28a745;">
                        <strong>Vậy phương trình có hai nghiệm: \\(x = 4\\) hoặc \\(x = -1\\)</strong>
                    </div>
                `,
                formula: "\\(x = 4\\) hoặc \\(x = -1\\)"
            }
        ],
        visualParams: {
            baseSize: 160,
            addSize: 72,
            startX: 100,
            startY: 40,
            type: 'minus'
        }
    },
    {
        title: "Ví dụ 3: \\(3x^2 - 5x + 1 = 0\\)",
        steps: [
            {
                title: "Phương trình ban đầu",
                content: `
                    <p>Giải phương trình:</p>
                    <div class="formula-box">\\[3x^2 - 5x + 1 = 0\\]</div>
                    <p>Đây là phương trình tổng quát với hệ số \\(a \\neq 1\\).</p>
                `,
                formula: "\\(3x^2 - 5x + 1 = 0\\)"
            },
            {
                title: "Chia cả hai vế cho \\(a = 3\\)",
                content: `
                    <p>Để đưa về dạng chuẩn, chia cả hai vế cho \\(3\\):</p>
                    <div class="formula-box">\\[x^2 - \\frac{5}{3}x + \\frac{1}{3} = 0\\]</div>
                    <p>Chuyển vế hằng số:</p>
                    <div class="formula-box">\\[x^2 - \\frac{5}{3}x = -\\frac{1}{3}\\]</div>
                `,
                formula: "\\(x^2 - \\frac{5}{3}x = -\\frac{1}{3}\\)"
            },
            {
                title: "Biểu diễn \\(x^2\\)",
                content: `
                    <p>Vẽ hình vuông cạnh \\(x\\) để biểu diễn \\(x^2\\).</p>
                    <div class="formula-box">Diện tích: \\(x \\times x = x^2\\)</div>
                `,
                formula: "\\(x^2\\)"
            },
            {
                title: "Trừ đi \\(\\frac{5}{3}x\\)",
                content: `
                    <p>Cắt bỏ hình chữ nhật có diện tích \\(\\frac{5}{3}x\\) (màu đỏ).</p>
                    <p>Chia làm hai phần: mỗi phần có chiều rộng \\(\\frac{5}{6}\\) và chiều dài \\(x\\).</p>
                    <div class="formula-box">\\(x^2 - \\frac{5}{3}x = x^2 - \\frac{5x}{6} - \\frac{5x}{6}\\)</div>
                `,
                formula: "\\(x^2 - \\frac{5}{3}x\\)"
            },
            {
                title: "Sắp xếp lại",
                content: `
                    <p>Di chuyển một nửa xuống dưới để tạo hình chữ L.</p>
                    <p>Các cạnh: \\(x\\) và \\(\\frac{5}{6}\\).</p>
                `,
                formula: "\\(x^2 - \\frac{5}{3}x\\)"
            },
            {
                title: "Hoàn thành bình phương",
                content: `
                    <p>Thêm hình vuông nhỏ \\(\\left(\\frac{5}{6}\\right)^2 = \\frac{25}{36}\\) vào góc (màu vàng).</p>
                    <div class="formula-box">\\[x^2 - \\frac{5}{3}x + \\frac{25}{36} = \\left(x - \\frac{5}{6}\\right)^2\\]</div>
                    <p>Vế phải cũng cộng thêm \\(\\frac{25}{36}\\):</p>
                    <div class="formula-box">\\(\\left(x - \\frac{5}{6}\\right)^2 = -\\frac{1}{3} + \\frac{25}{36} = -\\frac{12}{36} + \\frac{25}{36} = \\frac{13}{36}\\)</div>
                `,
                formula: "\\(\\left(x - \\frac{5}{6}\\right)^2 = \\frac{13}{36}\\)"
            },
            {
                title: "Giải phương trình",
                content: `
                    <p>Lấy căn bậc hai hai vế:</p>
                    <div class="formula-box">\\[x - \\frac{5}{6} = \\pm \\frac{\\sqrt{13}}{6}\\]</div>
                    <p><strong>Nghiệm 1:</strong> \\(x = \\frac{5 + \\sqrt{13}}{6} \\approx 1.434\\)</p>
                    <p><strong>Nghiệm 2:</strong> \\(x = \\frac{5 - \\sqrt{13}}{6} \\approx 0.232\\)</p>
                    <div class="formula-box" style="background: #d4edda; border-color: #28a745;">
                        <strong>Vậy: \\(x = \\frac{5 \\pm \\sqrt{13}}{6}\\)</strong>
                    </div>
                `,
                formula: "\\(x = \\frac{5 \\pm \\sqrt{13}}{6}\\)"
            }
        ],
        visualParams: {
            baseSize: 150,
            addSize: 62.5,
            startX: 100,
            startY: 40,
            type: 'minus'
        }
    }
];
