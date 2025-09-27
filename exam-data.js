const mathData = {
    metadata: {
        version: '2.1',
        lastUpdated: '2025-09-27',
        description: 'Dữ liệu bài kiểm tra và công cụ học tập Toán'
    },
    grades: {
        grade9: {
            exams: [
                // Dữ liệu lớp 9 giữ nguyên
                {
                    id: 'lop9_chuong1_dekiemtra_daydu',
                    title: 'Đề kiểm tra Chương 1',
                    type: 'exam',
                    description: 'Đề kiểm tra 90 phút về Căn bậc hai và Hằng đẳng thức.',
                    duration: 90 * 60,
                    subject: 'Toán học',
                    chapter: 'Chương 1',
                    questions: [
                        {
                            q_id: 'tn_q1',
                            question_text: `<strong>Câu 1:</strong> Nghiệm của phương trình $$( x + 5 ) ( 2 x - 10 ) = 0$$ là:
                                <br>A. \\(x = - 5\\) hoặc \\(x = 5\\).
                                <br>B. \\(x = 5\\).
                                <br>C. \\(x = - 5\\).`,
                            model_answer: `<strong>Đáp án đúng:</strong> A. \\(x = - 5\\) hoặc \\(x = 5\\).<br><br>
                           <strong>Phân tích:</strong> Đây là phương trình tích, ta cho từng thừa số bằng 0:<br>
                           \\(x + 5 = 0\\) \\(\\Rightarrow x = -5\\)<br>
                           \\(2x - 10 = 0\\) \\(\\Rightarrow 2x = 10\\) \\(\\Rightarrow x = 5\\)`
                        }
                    ]
                }
            ],
            tools: [],
            keys: []
        },
        grade10: {
            tools: [
                {
                    id: 'cong-cu-venn',
                    title: 'Công cụ Sơ đồ Venn',
                    type: 'tool',
                    url: 'cong-cu-venn.html',
                    description: 'Minh họa và giải các bài toán logic bằng sơ đồ Venn tương tác',
                    subject: 'Toán học',
                    topic: 'Tập hợp và các phép toán trên tập hợp',
                    icon: '📊'
                }
            ],
            exams: [
                {
                    id: 'lop10_tonghop_chuong1_5_goc',
                    title: 'Đề kiểm tra Chương 1 & 5',
                    type: 'exam',
                    description: 'Đề kiểm tra tổng hợp kiến thức Mệnh đề, Tập hợp và Lượng giác.',
                    duration: 90 * 60,
                    subject: 'Toán học',
                    chapter: 'Chương 1 & 5',
                    questions: [
                        // --- PHẦN I: TRẮC NGHIỆM ---
                        {
                            q_id: 'l10c15_tn1',
                            question_text: `<strong>Câu 1:</strong> Trong các phát biểu sau, đâu là một mệnh đề?
                                <br>A. Hàn Mạc Tử là một nhà thơ.
                                <br>B. Áo em trắng quá nhìn không ra !
                                <br>C. Hàn Mạc Tử có phải là nhà thơ trữ tình không?
                                <br>D. Đây Thôn Vĩ Dạ có phải là do Hàn Mạc Tử sáng tác không?`,
                            model_answer: `<strong>Đáp án đúng:</strong> A. Hàn Mạc Tử là một nhà thơ.<br><br>
                               <strong>Phân tích:</strong> Mệnh đề là một câu khẳng định có tính đúng hoặc sai.
                               <br>- Câu A là một khẳng định (đúng).
                               <br>- Câu B là câu cảm thán.
                               <br>- Câu C và D là câu hỏi.
                               <br>Do đó, chỉ có A là mệnh đề.`
                        },
                        {
                            q_id: 'l10c15_tn2',
                            question_text: `<strong>Câu 2:</strong> Cho mệnh đề chứa biến \\(P(x): "x+15 \\le x^2"\\) với x là số thực. Mệnh đề nào sau đây là đúng?
                                <br>A. \\(P(0)\\)
                                <br>B. \\(P(3)\\)
                                <br>C. \\(P(4)\\)
                                <br>D. \\(P(5)\\)`,
                            model_answer: `<strong>Đáp án đúng:</strong> D. \\(P(5)\\)<br><br>
                               <strong>Phân tích:</strong> Ta thay các giá trị của x vào bất phương trình \\(x+15 \\le x^2\\):
                               <br>- A: Với \\(x=0\\), ta có \\(0+15 \\le 0^2 \\Rightarrow 15 \\le 0\\) (Sai).
                               <br>- B: Với \\(x=3\\), ta có \\(3+15 \\le 3^2 \\Rightarrow 18 \\le 9\\) (Sai).
                               <br>- C: Với \\(x=4\\), ta có \\(4+15 \\le 4^2 \\Rightarrow 19 \\le 16\\) (Sai).
                               <br>- D: Với \\(x=5\\), ta có \\(5+15 \\le 5^2 \\Rightarrow 20 \\le 25\\) (Đúng).`
                        },
                        {
                            q_id: 'l10c15_tn3',
                            question_text: `<strong>Câu 3:</strong> Mệnh đề phủ định của mệnh đề \\(P: “ \\exists x \\in \\mathbb{N}, x^2+2x+5\\) là số nguyên tố” là:
                                <br>A. \\(\\forall x \\in \\mathbb{N}, x^2+2x+5\\) không là số nguyên tố.
                                <br>B. \\(\\exists x \\in \\mathbb{N}, x^2+2x+5\\) là hợp số.
                                <br>C. \\(\\forall x \\in \\mathbb{N}, x^2+2x+5\\) không phải là hợp số.
                                <br>D. \\(\\exists x \\in \\mathbb{N}, x^2+2x+5\\) là số thực.`,
                            model_answer: `<strong>Đáp án đúng:</strong> A. \\(\\forall x \\in \\mathbb{N}, x^2+2x+5\\) không là số nguyên tố.<br><br>
                               <strong>Phân tích:</strong> Phủ định của mệnh đề “\\(\\exists x, P(x)\\)” là “$$\\forall x, \\overline{P(x)}$$”.
                               <br>- Phủ định của “\\(\\exists\\)” (tồn tại) là “\\(\\forall\\)” (với mọi).
                               <br>- Phủ định của "là số nguyên tố" là "không là số nguyên tố".`
                        },
                        {
                            q_id: 'l10c15_tn4',
                            question_text: `<strong>Câu 4:</strong> Cho tập hợp \\(A=\\{x \\in \\mathbb{R} | x^2-x-2=0\\}\\). Viết lại tập A bằng cách liệt kê các phần tử?
                                <br>A. \\(A=\\{-1; 2\\}\\)
                                <br>B. \\(A=\\{-1\\}\\)
                                <br>C. \\(A=\\{2\\}\\)
                                <br>D. \\(A=\\{1; -2\\}\\)`,
                            model_answer: `<strong>Đáp án đúng:</strong> A. \\(A=\\{-1; 2\\}\\)<br><br>
                               <strong>Phân tích:</strong> Ta giải phương trình bậc hai \\(x^2-x-2=0\\).
                               <br>Phương trình có dạng a - b + c = 1 - (-1) - 2 = 0, nên có hai nghiệm là \\(x_1 = -1\\) và \\(x_2 = -\\frac{c}{a} = 2\\).
                               <br>Cả hai nghiệm đều là số thực nên tập hợp A gồm hai phần tử là -1 và 2.`
                        },
                        {
                            q_id: 'l10c15_tn5',
                            question_text: `<strong>Câu 5:</strong> Cho hai tập hợp \\(A=(-\\infty; 2]\\) và \\(B=(-6; +\\infty)\\). Tìm \\(A \\cap B\\).
                                <br>A. \\(A \\cap B = \\{-6; 2\\}\\)
                                <br>B. \\(A \\cap B = (-6; 2]\\)
                                <br>C. \\(A \\cap B = (-6; 2)\\)
                                <br>D. \\(A \\cap B = (-\\infty; +\\infty)\\)`,
                            model_answer: `<strong>Đáp án đúng:</strong> B. \\(A \\cap B = (-6; 2]\\)<br><br>
                               <strong>Phân tích:</strong> Phép giao (\\(\\cap\\)) là tìm những phần tử chung của cả hai tập hợp.
                               <br>Ta cần tìm các số x thỏa mãn đồng thời \\(x \\le 2\\) và \\(x > -6\\).
                               <br>Kết hợp lại ta được \\(-6 < x \\le 2\\), tương ứng với nửa khoảng \\((-6; 2]\\).`
                        },
                        {
                            q_id: 'l10c15_tn6',
                            question_text: `<strong>Câu 6:</strong> Cho tập hợp \\(X=\\{1; 2; 3; 4\\}\\). Số tập con có 3 phần tử của X là:
                                <br>A. 4
                                <br>B. 6
                                <br>C. 8
                                <br>D. 12`,
                            model_answer: `<strong>Đáp án đúng:</strong> A. 4<br><br>
                               <strong>Phân tích:</strong> Ta liệt kê tất cả các tập con của X có đúng 3 phần tử:
                               <br>- \\(\\{1, 2, 3\\}\\)
                               <br>- \\(\\{1, 2, 4\\}\\)
                               <br>- \\(\\{1, 3, 4\\}\\)
                               <br>- \\(\\{2, 3, 4\\}\\)
                               <br>Đếm lại, ta có tất cả 4 tập con.`
                        },
                        {
                            q_id: 'l10c15_tn7',
                            question_text: `<strong>Câu 7:</strong> Cho góc \\(\\alpha\\) tù (\\(90^\\circ < \\alpha < 180^\\circ\\)). Điều khẳng định nào sau đây là đúng?
                                <br>A. \\(\\sin{\\alpha} < 0\\)
                                <br>B. \\(\\cos{\\alpha} > 0\\)
                                <br>C. \\(\\tan{\\alpha} < 0\\)
                                <br>D. \\(\\cot{\\alpha} > 0\\)`,
                            model_answer: `<strong>Đáp án đúng:</strong> C. \\(\\tan{\\alpha} < 0\\)<br><br>
                               <strong>Phân tích:</strong> Khi góc \\(\\alpha\\) tù (thuộc góc phần tư thứ II):
                               <br>- \\(\\sin{\\alpha} > 0\\) (tung độ dương).
                               <br>- \\(\\cos{\\alpha} < 0\\) (hoành độ âm).
                               <br>- \\(\\tan{\\alpha} = \\frac{\\sin{\\alpha}}{\\cos{\\alpha}}\\) (dương chia âm) nên \\(\\tan{\\alpha} < 0\\).
                               <br>- \\(\\cot{\\alpha} = \\frac{\\cos{\\alpha}}{\\sin{\\alpha}}\\) (âm chia dương) nên \\(\\cot{\\alpha} < 0\\).
                               <br>Vậy, khẳng định C là đúng.`
                        },
                        {
                            q_id: 'l10c15_tn8',
                            question_text: `<strong>Câu 8:</strong> Cho \\(\\triangle ABC\\) có \\(BC=3, AC=4, \\hat{C}=60^\\circ\\). Khi đó độ dài cạnh AB bằng:
                                <br>A. \\(25\\)
                                <br>B. \\(\\sqrt{13}\\)
                                <br>C. \\(13\\)
                                <br>D. \\(5\\)`,
                            model_answer: `<strong>Đáp án đúng:</strong> B. \\(\\sqrt{13}\\)<br><br>
                               <strong>Phân tích:</strong> Áp dụng định lý cosin cho tam giác ABC:
                               <br>$$AB^2 = AC^2 + BC^2 - 2 \\cdot AC \\cdot BC \\cdot \\cos{C}$$
                               <br>$$AB^2 = 4^2 + 3^2 - 2 \\cdot 4 \\cdot 3 \\cdot \\cos{60^\\circ}$$
                               <br>$$AB^2 = 16 + 9 - 24 \\cdot \\frac{1}{2}$$
                               <br>$$AB^2 = 25 - 12 = 13$$
                               <br>$$AB = \\sqrt{13}$$`
                        },
                        {
                            q_id: 'l10c15_tn9',
                            question_text: `<strong>Câu 9:</strong> Cho tam giác ABC có độ dài ba cạnh lần lượt là \\(a=8, b=7, c=3\\). Số đo góc B là:
                                <br>A. \\(60^\\circ\\)
                                <br>B. \\(30^\\circ\\)
                                <br>C. \\(120^\\circ\\)
                                <br>D. \\(45^\\circ\\)`,
                            model_answer: `<strong>Đáp án đúng:</strong> A. \\(60^\\circ\\)<br><br>
                               <strong>Phân tích:</strong> Áp dụng hệ quả của định lý cosin để tính góc B:
                               <br>$$\\cos{B} = \\frac{a^2 + c^2 - b^2}{2ac}$$
                               <br>$$\\cos{B} = \\frac{8^2 + 3^2 - 7^2}{2 \\cdot 8 \\cdot 3}$$
                               <br>$$\\cos{B} = \\frac{64 + 9 - 49}{48} = \\frac{24}{48} = \\frac{1}{2}$$
                               <br>Vì \\(\\cos{B} = \\frac{1}{2}\\) nên \\(\\hat{B} = 60^\\circ\\).`
                        },
                        {
                            q_id: 'l10c15_tn10',
                            question_text: `<strong>Câu 10:</strong> Cho \\(\\tan{x}=3\\). Tính \\(P=\\frac{2\\sin{x}-\\cos{x}}{\\sin{x}+\\cos{x}}\\).
                                <br>A. \\(\\frac{3}{2}\\)
                                <br>B. \\(\\frac{5}{4}\\)
                                <br>C. 3
                                <br>D. \\(\\frac{2}{5}\\)`,
                            model_answer: `<strong>Đáp án đúng:</strong> B. \\(\\frac{5}{4}\\)<br><br>
                               <strong>Phân tích:</strong> Vì \\(\\tan{x}=3\\), nên \\(\\cos{x} \\neq 0\\). Ta có thể chia cả tử và mẫu của P cho \\(\\cos{x}\\):
                               <br>$$P = \\frac{\\frac{2\\sin{x}}{\\cos{x}} - \\frac{\\cos{x}}{\\cos{x}}}{\\frac{\\sin{x}}{\\cos{x}} + \\frac{\\cos{x}}{\\cos{x}}}$$
                               <br>$$P = \\frac{2\\tan{x} - 1}{\\tan{x} + 1}$$
                               <br>Thay \\(\\tan{x}=3\\) vào biểu thức:
                               <br>$$P = \\frac{2(3) - 1}{3 + 1} = \\frac{5}{4}$$`
                        },
                        // --- PHẦN II: ĐÚNG/SAI ---
                        {
                            q_id: 'l10c15_ds1',
                            question_text: `<strong>Câu 1 (Đúng/Sai):</strong> Cho mệnh đề chứa biến \\(P(x): "x > x^3"\\).
                                <br>a) \\(P(1)\\) là mệnh đề đúng.
                                <br>b) \\(P(\\frac{1}{3})\\) là mệnh đề đúng.
                                <br>c) \\(\\forall x \\in \\mathbb{N}, P(x)\\) là mệnh đề đúng.
                                <br>d) \\(\\exists x \\in \\mathbb{Q}, P(x)\\) là mệnh đề đúng.`,
                            model_answer: `<strong>Đáp án:</strong>
                                <br>a) <strong>Sai.</strong> (Vì \\(1 > 1^3 \\Leftrightarrow 1 > 1\\) là sai)
                                <br>b) <strong>Đúng.</strong> (Vì \\(\\frac{1}{3} > (\\frac{1}{3})^3 \\Leftrightarrow \\frac{1}{3} > \\frac{1}{27}\\) là đúng)
                                <br>c) <strong>Sai.</strong> (Ví dụ \\(x=0 \\in \\mathbb{N}\\), \\(0>0^3\\) là sai; \\(x=2 \\in \\mathbb{N}\\), \\(2>2^3\\) là sai)
                                <br>d) <strong>Đúng.</strong> (Ví dụ \\(x=\\frac{1}{3} \\in \\mathbb{Q}\\) đã chứng minh ở câu b)`
                        },
                        {
                            q_id: 'l10c15_ds2',
                            question_text: `<strong>Câu 2 (Đúng/Sai):</strong> Cho hai tập hợp \\(M=\\{x \\in \\mathbb{N} | -1 \\le x \\le 2\\}\\), \\(N=\\{-1; 0; 2\\}\\).
                                <br>a) Viết lại tập M bằng cách liệt kê các phần tử, ta có \\(M=\\{0; 1; 2\\}\\).
                                <br>b) \\(M \\cap N = \\{0; 2\\}\\).
                                <br>c) \\(M \\cup N = \\{-1; 0; 1; 2\\}\\).
                                <br>d) \\(M \\setminus N = \\{1\\}\\).`,
                            model_answer: `<strong>Đáp án:</strong>
                                <br>a) <strong>Đúng.</strong> (Các số tự nhiên x thỏa mãn \\(-1 \\le x \\le 2\\) là 0, 1, 2)
                                <br>b) <strong>Đúng.</strong> (Các phần tử chung của M và N là 0 và 2)
                                <br>c) <strong>Đúng.</strong> (Hợp của M và N là tất cả các phần tử của cả hai tập hợp)
                                <br>d) <strong>Đúng.</strong> (Hiệu M cho N là các phần tử thuộc M nhưng không thuộc N)`
                        },
                        {
                            q_id: 'l10c15_ds3',
                            question_text: `<strong>Câu 3 (Đúng/Sai):</strong> Cho \\(\\sin{\\alpha} = \\frac{5}{13}\\) và \\(90^\\circ < \\alpha < 180^\\circ\\).
                                <br>a) \\(\\cos{\\alpha} < 0\\).
                                <br>b) \\(\\cos{\\alpha} = -\\frac{12}{13}\\).
                                <br>c) \\(\\tan{\\alpha} = -\\frac{5}{12}\\).
                                <br>d) \\(\\cot{\\alpha} = \\frac{12}{5}\\).`,
                            model_answer: `<strong>Đáp án:</strong>
                                <br>a) <strong>Đúng.</strong> (Góc \\(\\alpha\\) tù thuộc góc phần tư thứ II nên có cos âm)
                                <br>b) <strong>Đúng.</strong> (Từ \\(\\sin^2{\\alpha} + \\cos^2{\\alpha} = 1 \\Rightarrow \\cos^2{\\alpha} = 1 - (\\frac{5}{13})^2 = \\frac{144}{169}\\). Vì \\(\\cos{\\alpha} < 0\\) nên \\(\\cos{\\alpha} = -\\frac{12}{13}\\))
                                <br>c) <strong>Đúng.</strong> (\\(\\tan{\\alpha} = \\frac{\\sin{\\alpha}}{\\cos{\\alpha}} = \\frac{5/13}{-12/13} = -\\frac{5}{12}\\))
                                <br>d) <strong>Sai.</strong> (\\(\\cot{\\alpha} = \\frac{1}{\\tan{\\alpha}} = -\\frac{12}{5}\\))`
                        },
                        {
                            q_id: 'l10c15_ds4',
                            question_text: `<strong>Câu 4 (Đúng/Sai):</strong> Cho tam giác MNP có \\(MN=13\\), \\(MP=10\\), \\(\\cos{M}=\\frac{5}{13}\\).
                                <br>a) \\(NP^2 = MN^2+MP^2 - 2 \\cdot MN \\cdot MP \\cdot \\cos{M}\\).
                                <br>b) Độ dài cạnh NP là 13.
                                <br>c) Tam giác MNP cân tại M.
                                <br>d) \\(\\sin{P} = \\frac{12}{13}\\).`,
                            model_answer: `<strong>Đáp án:</strong>
                                <br>a) <strong>Đúng.</strong> (Đây là công thức của định lý cosin)
                                <br>b) <strong>Đúng.</strong> (\\(NP^2 = 13^2 + 10^2 - 2 \\cdot 13 \\cdot 10 \\cdot \\frac{5}{13} = 169 + 100 - 100 = 169 \\Rightarrow NP=13\\))
                                <br>c) <strong>Sai.</strong> (Vì \\(MN = NP = 13\\), tam giác MNP cân tại N)
                                <br>d) <strong>Đúng.</strong> (Dùng định lý cosin cho góc P: \\(\\cos P = \\frac{MP^2+NP^2-MN^2}{2 \\cdot MP \\cdot NP} = \\frac{10^2+13^2-13^2}{2 \\cdot 10 \\cdot 13} = \\frac{100}{260} = \\frac{5}{13}\\). Suy ra \\(\\sin P = \\sqrt{1-\\cos^2 P} = \\sqrt{1-(\\frac{5}{13})^2} = \\frac{12}{13}\\))`
                        },
                        // --- PHẦN III: TỰ LUẬN ---
                        {
                            q_id: 'l10c15_tl1',
                            is_group: true,
                            group_title: '<strong>PHẦN TỰ LUẬN</strong>',
                            sub_questions: [
                                {
                                    q_id: 'l10c15_tl1a',
                                    question_text: '<strong>Câu 1:</strong> Thầy Đạt giao cho lớp 10A2 dự án điều tra về tình hình sử dụng nước uống trong sinh hoạt hằng ngày của các học sinh trong trường. Sau một tuần tiến hành phỏng vấn thu thập thông tin, nhóm điều tra thu được số liệu sau đây:<br>- Có 184 bạn trả lời phỏng vấn là có uống nước đun sôi hằng ngày;<br>- Có 150 bạn trả lời phỏng vấn là có uống nước đóng chai hằng ngày;<br>Trong số những bạn trả lời phỏng vấn, 87 bạn trả lời là có sử dụng cả nước đun sôi và nước đóng chai hằng ngày.<br>Hãy giúp nhóm điều tra xác định số lượng học sinh đã tham gia phỏng vấn, biết rằng tất cả các bạn được phỏng vấn đều chỉ uống nước đun sôi hoặc uống nước đóng chai.',
                                    model_answer: `<strong>Lời giải:</strong><br>
                                        Gọi S là tập hợp học sinh uống nước đun sôi, C là tập hợp học sinh uống nước đóng chai.<br>
                                        Ta có: \\(|S| = 184\\), \\(|C| = 150\\), \\(|S \\cap C| = 87\\).<br>
                                        Số học sinh đã được khảo sát là \\(|S \\cup C|\\).<br>
                                        Áp dụng công thức bao hàm - loại trừ: \\(|S \\cup C| = |S| + |C| - |S \\cap C|\\).<br>
                                        \\(|S \\cup C| = 184 + 150 - 87 = 247\\).<br>
                                        <strong>Vậy, nhóm đã khảo sát 247 học sinh.</strong>`
                                },
                                {
                                    q_id: 'l10c15_tl1b',
                                    question_text: '<strong>Câu 2:</strong> Cho tập hợp \\(A=(-\\infty; 3)\\) và \\(B=[-2; 5)\\). Số phần tử nguyên dương của tập \\(C=A \\cap B\\) là bao nhiêu?',
                                    model_answer: `<strong>Lời giải:</strong><br>
                                        Giao của A và B là: $$A \\cap B = [-2; 3)$$.<br>
                                        Các số nguyên thuộc tập này là: \\(\\{-2, -1, 0, 1, 2\\}\\).<br>
                                        Các số nguyên dương trong đó là: \\(\\{1, 2\\}\\).<br>
                                        <strong>Vậy có 2 số nguyên dương.</strong>`
                                },
                                {
                                    q_id: 'l10c15_tl1c',
                                    question_text: '<strong>Câu 3:</strong> Cho tập \\(A=\\{3;4;5;6;7\\}\\) và \\(B=\\{3;5;7\\}\\). Tìm số tập X sao cho \\(X \\cup B = A\\)?',
                                    model_answer: `<strong>Lời giải:</strong><br>
                                        Để \\(X \\cup B = A\\), tập X phải thỏa mãn 2 điều kiện:<br>
                                        1. X phải chứa tất cả các phần tử của A mà không có trong B. Tức là X phải chứa \\(\\{4, 6\\}\\).<br>
                                        2. X có thể chứa hoặc không chứa các phần tử của B.
                                        <br>Tập B có 3 phần tử, nên số tập con của B là \\(2^3 = 8\\). Mỗi tập con này kết hợp với \\(\\{4, 6\\}\\) sẽ tạo ra một tập X thỏa mãn.
                                        <br><strong>Vậy, có 8 tập hợp X.</strong>`
                                },
                                {
                                    q_id: 'l10c15_tl1d',
                                    question_text: '<strong>Câu 4:</strong> Tính giá trị của biểu thức \\(S = \\cos^2{5^\\circ} + \\cos^2{10^\\circ} + ... + \\cos^2{85^\\circ}\\).',
                                    model_answer: `<strong>Lời giải:</strong><br>
                                        Áp dụng công thức \\(\\cos^2{\\alpha} + \\sin^2{\\alpha} = 1\\) và \\(\\sin{\\alpha} = \\cos{(90^\\circ - \\alpha)}\\).<br>
                                        Ta có: \\(S = (\\cos^2{5^\\circ} + \\cos^2{85^\\circ}) + (\\cos^2{10^\\circ} + \\cos^2{80^\\circ}) + ... + (\\cos^2{40^\\circ} + \\cos^2{50^\\circ}) + \\cos^2{45^\\circ}\\).<br>
                                        Mỗi cặp \\((\\cos^2{\\alpha} + \\cos^2{(90^\\circ-\\alpha)}) = 1\\). Có 8 cặp như vậy.<br>
                                        $$S = 8 \\times 1 + (\\frac{\\sqrt{2}}{2})^2 = 8 + \\frac{1}{2} = 8.5$$.<br>
                                        <strong>Vậy, S = 8.5</strong>.`
                                },
                                {
                                    q_id: 'l10c15_tl1e',
                                    question_text: '<strong>Câu 5:</strong> Ở lớp 10A, mỗi học sinh đều có thể chơi được ít nhất 1 trong 3 môn thể thao là cầu lông, bóng đá và bóng chuyền. Có 11 em chơi được bóng đá, 10 em chơi được cầu lông và 8 em chơi được bóng chuyền. Có 2 em chơi được cả 3 môn, có 5 em chơi được bóng đá và bóng chuyền, có 4 em chơi được bóng đá và cầu lông, có 4 em chơi được bóng chuyền và cầu lông. Hỏi lớp học có bao nhiêu học sinh?',
                                    model_answer: `<strong>Lời giải:</strong><br>
                                        Gọi số học sinh chơi bóng đá, cầu lông, bóng chuyền lần lượt là |BĐ|, |CL|, |BC|.<br>
                                        Sĩ số lớp = |BĐ \\(\\cup\\) CL \\(\\cup\\) BC|<br>
                                        = |BĐ| + |CL| + |BC| - (|BĐ \\(\\cap\\) CL| + |BĐ \\(\\cap\\) BC| + |CL \\(\\cap\\) BC|) + |BĐ \\(\\cap\\) CL \\(\\cap\\) BC|<br>
                                        = 11 + 10 + 8 - (4 + 5 + 4) + 2<br>
                                        = 29 - 13 + 2 = 18.<br>
                                        <strong>Vậy, sĩ số lớp là 18 học sinh.</strong><br><br>
                                        <strong>Cách khác:</strong> Sử dụng <a href="cong-cu-venn.html" style="color: #3b82f6; text-decoration: none; font-weight: 500;">công cụ sơ đồ Venn</a> để giải bài toán này một cách trực quan.`
                                },
                                {
                                    q_id: 'l10c15_tl1f',
                                    question_text: '<strong>Câu 6:</strong> Một ô tô muốn đi từ A đến C nhưng giữa A và C là một ngọn núi cao nên ô tô phải đi thành hai đoạn từ A đến B rồi từ B đến C. Các đoạn đường tạo thành tam giác ABC có \\(AB=150km\\), \\(BC=200km\\) và \\(\\hat{ABC}=120^\\circ\\). Nếu người ta làm một đoạn đường hầm xuyên núi chạy thẳng từ A đến C thì chiều dài của đường hầm là bao nhiêu km? (làm tròn đến hàng phần trăm)',
                                    model_answer: `<strong>Lời giải:</strong><br>
                                        Áp dụng định lý cosin cho \\(\\triangle ABC\\):<br>
                                        $$AC^2 = AB^2 + BC^2 - 2 \\cdot AB \\cdot BC \\cdot \\cos{\\hat{B}}$$
                                        $$AC^2 = 150^2 + 200^2 - 2 \\cdot 150 \\cdot 200 \\cdot \\cos{120^\\circ}$$
                                        $$AC^2 = 22500 + 40000 - 60000 \\cdot (-\\frac{1}{2})$$
                                        $$AC^2 = 62500 + 30000 = 92500$$
                                        $$AC = \\sqrt{92500} \\approx 304.14$$ km.<br>
                                        <strong>Vậy, đường hầm dài khoảng 304.14 km.</strong>`
                                }
                            ]
                        }
                    ]
                }
            ],
            tools: [
                {
                    id: 'lop10_cong_cu_bieu_dien_tap_hop',
                    title: 'Công cụ biểu diễn tập hợp',
                    type: 'tool',
                    url: 'cong-cu-bieu-dien-tap-hop.html',
                    description: 'Công cụ tương tác để biểu diễn và so sánh các tập hợp số thực trên trục số.',
                    subject: 'Toán học',
                    topic: 'Tập hợp và khoảng số'
                }
            ],
            keys: []
        },
        grade11: {
            exams: [],
            tools: [],
            keys: []
        },
        grade12: {
            exams: [],
            tools: [],
            keys: []
        }
    }
};
        

window.examData = mathData;