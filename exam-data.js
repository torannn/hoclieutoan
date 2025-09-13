const mathData = {
    grade9: [
        {
            id: 'lop9_chuong1_dekiemtra_daydu',
            title: 'Đề kiểm tra Chương 1',
            duration: 90 * 60, // 90 phút
            questions: [
                // ========================
                // ===== PHẦN TRẮC NGHIỆM =====
                // ========================
                {
                    q_id: 'tn_q1',
                    question_text: `<strong>Câu 1:</strong> Nghiệm của phương trình $$( x + 5 ) ( 2 x - 10 ) = 0$$ là:
                        <br>A. \\(x = - 5\\) hoặc \\(x = 5\\).
                        <br>B. \\(x = 5\\).
                        <br>C. \\(x = - 5\\).
                        <br>D. \\(x \\neq 5\\).
                        <br>E. \\(x = - 5\\) hoặc \\(x = 10\\).
                        <br>F. Không có lựa chọn nào là chính xác.`,
                    model_answer: `<strong>Đáp án đúng:</strong> A. \\(x = - 5\\) hoặc \\(x = 5\\).<br><br>
                       <strong>Phân tích:</strong> Đây là phương trình tích, ta cho từng thừa số bằng 0:<br>
                       \\(x + 5 = 0\\) hay \\(x = -5\\)<br>
                       \\(2x - 10 = 0\\) hay \\(2x = 10\\) hay \\(x = 5\\)`
                },
                {
                    q_id: 'tn_q2',
                    question_text: `<strong>Câu 2:</strong> Điều kiện xác định của phương trình $$\\frac{2 x + 1}{x - 7} + 2 = \\frac{3}{x - 2}$$ là:
                        <br>A. \\(x \\neq 7\\).
                        <br>B. \\(x \\neq 2\\).
                        <br>C. \\(x \\neq 7\\) và \\(x \\neq 2\\).
                        <br>D. \\(x = 7\\) và \\(x = 2\\).
                        <br>E. \\(x \\neq 7\\) hoặc \\(x \\neq 2\\).
                        <br>F. Không có lựa chọn nào là chính xác.`,
                    model_answer: `<strong>Đáp án đúng:</strong> C. \\(x \\neq 7\\) và \\(x \\neq 2\\).<br><br>
                       <strong>Phân tích:</strong> Điều kiện xác định của một phương trình chứa ẩn ở mẫu là tất cả các mẫu số phải khác 0.<br>
                       \\(x - 7 \\neq 0\\) hay \\(x \\neq 7\\)<br>
                       \\(x - 2 \\neq 0\\) hay \\(x \\neq 2\\)<br>
                       Cả hai điều kiện này phải được thỏa mãn <strong>đồng thời</strong>, do đó phải dùng từ "và".<br><br>
                       <strong>Lưu ý:</strong> Đáp án E (\\(x \\neq 7\\) hoặc \\(x \\neq 2\\)) là lỗi sai về logic. Trong toán học, điều kiện xác định yêu cầu tất cả các mẫu phải khác 0, nên phải dùng liên từ "và" để biểu thị sự đồng thời, không phải "hoặc".`
                },
                {
                    q_id: 'tn_q3',
                    question_text: `<strong>Câu 3:</strong> Nghiệm của phương trình $$\\frac{x + 1}{x - 2} - 1 = \\frac{24}{( x + 3 ) ( x - 2 )}$$ là:
                        <br>A. \\(x = 2\\).
                        <br>B. \\(x = 5\\).
                        <br>C. \\(x = -3\\).
                        <br>D. \\(x = -5\\).
                        <br>E. \\(x = 3\\).
                        <br>F. Không có lựa chọn nào là chính xác.`,
                    model_answer: `<strong>Đáp án đúng:</strong> B. \\(x = 5\\).<br><br>
                       <strong>Phân tích:</strong><br>
                       ĐKXĐ: \\(x \\neq 2\\) và \\(x \\neq -3\\).<br>
                       Quy đồng và khử mẫu: \\((x+1)(x+3) - (x-2)(x+3) = 24\\)<br>
                       Rút gọn: \\((x^2 + 4x + 3) - (x^2 + x - 6) = 24\\)<br>
                       \\(3x + 9 = 24\\)<br>
                       \\(3x = 15\\)<br>
                       \\(x = 5\\)<br>
                       Nghiệm \\(x = 5\\) thỏa mãn ĐKXĐ. <br><br>
                       <strong>Lưu ý:</strong><br>
                       Đáp án A và C là các giá trị trong ĐKXĐ. Học sinh nếu không đối chiếu nghiệm với ĐKXĐ có thể chọn nhầm.<br>
                       Đáp án E (\\(x=3\\)) có thể là kết quả của lỗi tính toán. Ví dụ, nếu khai triển sai \\(( x - 2 ) ( x + 3 )\\) thành \\(x^{2} - x - 6\\) (sai dấu), phương trình sẽ dẫn đến \\(5 x = 15\\) hay \\(x = 3\\).`
                },
                {
                    q_id: 'tn_q4',
                    question_text: `<strong>Câu 4:</strong> Phương trình nào sau đây là phương trình bậc nhất hai ẩn?
                        <br>A. \\(2 x^{2} + 2 = 0\\)
                        <br>B. \\(3 y - 1 = 5 ( y - 2 )\\)
                        <br>C. \\(2 x + \\frac{y}{3} - 1 = 0\\)
                        <br>D. \\(3 \\sqrt{x} + y^{2} = 0\\)
                        <br>E. x y + x = 1\\)
                        <br>F. Không có lựa chọn nào là chính xác.`,
                    model_answer: `<strong>Đáp án đúng:</strong> C. \\(2 x + \\frac{y}{3} - 1 = 0\\).<br><br>
                       <strong>Phân tích:</strong> Phương trình bậc nhất hai ẩn có dạng \\(ax + by = c\\) (với a và b không đồng thời bằng 0). Phương trình C có thể viết lại thành \\(2x + \\frac{1}{3}y = 1\\), hoàn toàn khớp với định dạng.<br><br>
                       <strong>Lưu ý:</strong> Đáp án E (\\(xy + x = 1\\)) có hai ẩn, nhưng sự xuất hiện của tích \\(xy\\) làm cho phương trình này không còn là "bậc nhất". Bậc của một đơn thức nhiều biến là tổng số mũ của các biến, nên bậc của \\(xy\\) là 2.`
                },
                {
                    q_id: 'tn_q5',
                    question_text: `<strong>Câu 5:</strong> Đường thẳng biểu diễn tất cả các nghiệm của phương trình $$2 x - y = 1$$ có đặc điểm nào sau đây?
                        <br>A. Vuông góc với trục hoành.
                        <br>B. Vuông góc với trục tung.
                        <br>C. Đi qua gốc tọa độ.
                        <br>D. Đi qua điểm A(1; 1).
                        <br>E. Đi qua điểm \\(B(0; 1)\\).
                        <br>F. Không có lựa chọn nào là chính xác.`,
                    model_answer: `<strong>Đáp án đúng:</strong> D. Đi qua điểm A(1; 1).<br><br>
                       <strong>Phân tích:</strong> Ta kiểm tra bằng cách thay tọa độ các điểm vào phương trình.<br>
                       Thay A(1; 1): \\(2(1) - 1 = 1\\). Mệnh đề đúng, vậy đường thẳng đi qua A.<br><br>
                       <strong>Lưu ý:</strong> Đáp án E (Đi qua điểm B(0; 1)) là một lỗi sai phổ biến. Khi viết lại phương trình thành \\(y = 2x - 1\\), học sinh có thể nhìn nhầm tung độ gốc là 1 thay vì -1. Điểm mà đường thẳng cắt trục tung phải là (0; -1).`
                },
                {
                    q_id: 'tn_q6',
                    question_text: `<strong>Câu 6:</strong> Cặp số \\(( 3 ; - 1 )\\) là nghiệm của hệ phương trình nào sau đây?
                        <br>A. $$\\begin{cases}3 x + 2 y = 4 \\\\ 2 x - y = 5\\end{cases}$$
                        <br>B. $$\\begin{cases}2 x - y = 7 \\\\ x - 2 y = 5\\end{cases}$$
                        <br>C. $$\\begin{cases}2 x - 2 y = 5 \\\\ x + 3 y = 0\\end{cases}$$
                        <br>D. $$\\begin{cases}4 x - 2 y = 5 \\\\ x - 3 y = 7\\end{cases}$$
                        <br>E. $$\\begin{cases}2 x - y = 7 \\\\ x - 2 y = 4\\end{cases}$$
                        <br>F. Không có lựa chọn nào là chính xác.`,
                    model_answer: `<strong>Đáp án đúng:</strong> B.<br><br>
                       <strong>Phân tích:</strong> Thay \\(x = 3\\) và \\(y = -1\\) vào từng phương trình trong hệ B:<br>
                       Phương trình trên: \\(2(3) - (-1) = 6 + 1 = 7\\) (Thỏa mãn)<br>
                       Phương trình dưới: \\((3) - 2(-1) = 3 + 2 = 5\\) (Thỏa mãn)`
                },
                {
                    q_id: 'tn_q7',
                    question_text: `<strong>Câu 7:</strong> Một học sinh giải phương trình $$\\frac{x^{2}}{x - 3} = \\frac{9}{x - 3}$$ theo các bước sau:
                          <br>- <strong>Bước 1:</strong> Điều kiện xác định (ĐKXĐ): \\(x - 3 \\neq 0\\) hay \\(x \\neq 3\\).
                          <br>- <strong>Bước 2:</strong> Khử mẫu, ta được: \\(x^{2} = 9\\).
                          <br>- <strong>Bước 3:</strong> Giải ra \\(x = 3\\) hoặc \\(x = -3\\).
                          <br>- <strong>Bước 4:</strong> Kết luận \\(S = \\{ 3 ; -3 \\}\\).
                          <br><br>Theo bạn, học sinh đó đã làm <strong>sai từ bước nào</strong>?
                          <br>A. Bước 1.
                          <br>B. Bước 2.
                          <br>C. Bước 3.
                          <br>D. Bước 4.
                          <br>E. Toàn bộ bài giải đều đúng.`,
                    model_answer: `<strong>Đáp án đúng:</strong> D. Bước 4.<br><br>
                         <strong>Phân tích:</strong> Các bước 1, 2, 3 đều chính xác. Lỗi sai nằm ở bước cuối cùng: kết luận nghiệm. Học sinh đã không đối chiếu hai nghiệm \\(x = 3\\) và \\(x = -3\\) với ĐKXĐ (\\(x \\neq 3\\)). Nghiệm \\(x = 3\\) phải bị loại bỏ. Do đó, tập nghiệm đúng của phương trình phải là \\(S = \\{-3\\}\\).<br><br>
                         <strong>Lưu ý:</strong> Đáp án E (Toàn bộ bài giải đều đúng) là lựa chọn mà học sinh sẽ chọn nếu quên mất quy tắc cốt lõi khi giải phương trình chứa ẩn ở mẫu: <strong>luôn phải đối chiếu nghiệm với điều kiện xác định.</strong>`
                },
                {
                    q_id: 'tn_q8',
                    question_text: `<strong>Câu 8:</strong> Chọn đúng hoặc sai cho mỗi ý a), b), c), d) về phương trình <strong>$$2x + y = 3$$</strong>.
                          <br>a) Cặp số \\((3; –3)\\) là một nghiệm của phương trình đã cho.
                          <br>b) Phương trình đã cho chỉ có một nghiệm.
                          <br>c) Phương trình đã cho có vô số nghiệm.
                          <br>d) Tất cả nghiệm của phương trình được biểu diễn bởi đường thẳng \\(y = –2x + 3\\).`,
                    model_answer: `<strong>Đáp án đúng:</strong> a) Đúng, b) Sai, c) Đúng, d) Đúng.<br><br>
                         <strong>Phân tích:</strong><br>
                         a) Thay \\(x = 3, y = -3\\) vào \\(2x+y=3\\), ta có \\(2(3) + (-3) = 6 - 3 = 3\\). Đúng.<br>
                         b) Đây là phương trình bậc nhất hai ẩn. Nó có <strong>vô số</strong> nghiệm (là tập hợp các điểm nằm trên một đường thẳng), chứ không phải chỉ một nghiệm. Sai.<br>
                         c) Vì nó không có một nghiệm, nó có vô số nghiệm. Đúng.<br>
                         d) Chuyển vế \\(2x + y = 3\\) hay \\(y = -2x + 3\\). Đây chính là phương trình của đường thẳng biểu diễn tất cả các cặp nghiệm (x, y). Đúng.<br><br>
                         <strong>Lưu ý:</strong> Sự nhầm lẫn chủ yếu nằm ở ý (b) và (c). Học sinh có thể quen với việc một "phương trình" sẽ cho ra "một đáp số" và không nhận ra rằng một phương trình bậc nhất hai ẩn mô tả một mối quan hệ, tương ứng với vô số cặp số (điểm) thỏa mãn nó.`
                },
                // ========================
                // ===== PHẦN TỰ LUẬN =====
                // ========================
                {
                    q_id: 'tl_b1',
                    is_group: true,
                    group_title: '<strong>Bài 1 (6 điểm).</strong> Giải các phương trình, hệ phương trình sau:',
                    sub_questions: [
                        {
                            q_id: 'tl_b1a',
                            question_text: 'a) $$\\frac{2}{x - 2} + \\frac{3}{x + 2} = \\frac{3 x - 4}{x^{2} - 4}$$',
                            model_answer: `<strong>Lời giải:</strong><br>ĐKXĐ: \\(x \\neq \\pm 2\\).<br>Phương trình trở thành: $$2(x+2) + 3(x-2) = 3x - 4$$<br>$$5x - 2 = 3x - 4$$<br>$$2x = -2$$ hay \\(x = -1\\) (Thỏa mãn ĐKXĐ).<br>Vậy, \\(S = \\{-1\\}\\).`
                        },
                        {
                            q_id: 'tl_b1b',
                            question_text: 'b) $$\\frac{x - 3}{x + 3} - \\frac{x + 3}{x - 3} = \\frac{- 36}{x^{2} - 9}$$',
                            model_answer: `<strong>Lời giải:</strong><br>ĐKXĐ: \\(x \\neq \\pm 3\\).<br>Phương trình trở thành: $$(x-3)^2 - (x+3)^2 = -36$$<br>$$(x^2 - 6x + 9) - (x^2 + 6x + 9) = -36$$<br>$$-12x = -36$$ hay \\(x = 3\\) (Không thỏa mãn ĐKXĐ).<br>Vậy, phương trình vô nghiệm.`
                        },
                        {
                            q_id: 'tl_b1c',
                            question_text: 'c) $$y^{2} - 7 y + 2 ( y - 7 ) = 0$$',
                            model_answer: `<strong>Lời giải:</strong><br>$$y(y-7) + 2(y-7) = 0$$<br>$$(y-7)(y+2) = 0$$<br>\\(y = 7\\) hoặc \\(y = -2\\).`
                        },
                        {
                            q_id: 'tl_b1d',
                            question_text: 'd) $$4 x^{2} - 1 = ( 2 x - 1 ) ( 3 x + 7 )$$',
                            model_answer: `<strong>Lời giải:</strong><br>$$4x^2 - 1 = 6x^2 + 11x - 7$$<br>$$2x^2 + 11x - 6 = 0$$<br>Phương trình có hai nghiệm: \\(x_1 = -6, x_2 = \\frac{1}{2}\\).`
                        },
                        {
                            q_id: 'tl_b1e',
                            question_text: 'e) $$\\begin{cases}\\frac{3}{2} x - 2 y = 5 \\\\ 4 x + y = 7\\end{cases}$$',
                            model_answer: `<strong>Lời giải:</strong><br>Từ PT(2) có \\(y = 7 - 4x\\).<br>Thế vào PT(1): $$\\frac{3}{2}x - 2(7-4x) = 5$$<br>$$\\frac{19}{2}x = 19$$ hay \\(x=2\\).<br>Suy ra \\(y = 7 - 4(2) = -1\\).<br>Vậy, nghiệm là \\((2; -1)\\).`
                        },
                        {
                            q_id: 'tl_b1f',
                            question_text: 'f) $$\\begin{cases}4 x + 3 y = - 9 \\\\ \\frac{3}{4} x - \\frac{1}{2} y = \\frac{29}{8}\\end{cases}$$',
                            model_answer: `<strong>Lời giải:</strong><br>Nhân PT(2) với 8 ta được: \\(6x - 4y = 29\\).<br>Ta giải hệ $$\\begin{cases}4x + 3y = -9 \\\\ 6x - 4y = 29\\end{cases}$$<br>Hệ có nghiệm \\((x;y) = (\\frac{3}{2}; -5)\\).`
                        }
                    ]
                },
                {
                    q_id: 'tl_b2',
                    question_text: `<strong>Bài 2 (1 điểm):</strong> Một xe tải dự định di chuyển từ A đến B với tốc độ không đổi trong một thời gian nhất định. Nếu tốc độ của xe giảm 10 km/h thì đến B chậm hơn dự định 45 phút. Nếu tốc độ của xe nhanh hơn tốc độ dự định 10 km/h thì sẽ đến B sớm hơn dự định 30 phút. Tính tốc độ và thời gian dự định của xe tải đó.`,
                    model_answer: `<strong>Lời giải chi tiết:</strong><br><br>
                         <strong>1. Thiết lập các ẩn số và phương trình cơ sở</strong><br>
                        Gọi \\(x\\) là vận tốc dự định của xe tải (đơn vị: km/h).<br>
                        Gọi \\(y\\) là thời gian dự định của xe tải (đơn vị: giờ).<br>
                        Điều kiện: \\(x > 10, y > 0,5\\).<br>
                        Quãng đường AB được xác định bởi công thức: \\(S = xy\\).<br><br>
                         <strong>2. Phân tích và lập phương trình từ các tình huống</strong><br>
                          <strong>Tình huống 1: Đi chậm hơn</strong><br>
                        Vận tốc thực tế: \\(x - 10\\) (km/h).<br>
                        Thời gian thực tế: \\(y + 0,75\\) (giờ), (vì 45 phút = 0,75 giờ).<br>
                         Vì quãng đường không đổi, ta có phương trình:<br>
                         $$(x - 10)(y + 0,75) = xy$$
                         $$xy + 0,75x - 10y - 7,5 = xy$$
                         $$0,75x - 10y = 7,5$$ (I)<br><br>
                          <strong>Tình huống 2: Đi nhanh hơn</strong><br>
                         Vận tốc thực tế: \\(x + 10\\) (km/h).<br>
                         Thời gian thực tế: \\(y - 0,5\\) (giờ), (vì 30 phút = 0,5 giờ).<br>
                         Ta có phương trình thứ hai:<br>
                         $$(x + 10)(y - 0,5) = xy$$
                         $$xy - 0,5x + 10y - 5 = xy$$
                         $$-0,5x + 10y = 5$$ (II)<br><br>
                         <strong>3. Giải hệ phương trình</strong><br>
                         Ta có hệ phương trình:<br>
                         $$\\begin{cases} 0,75x - 10y = 7,5 & \\text{(I)} \\\\ -0,5x + 10y = 5 & \\text{(II)} \\end{cases}$$
                         Sử dụng phương pháp cộng đại số, cộng vế theo vế của hai phương trình (I) và (II):<br>
                         $$(0,75x - 10y) + (-0,5x + 10y) = 7,5 + 5$$
                         $$0,25x = 12,5$$
                         $$x = 50$$
                         Thay \\(x = 50\\) vào phương trình (II):<br>
                         $$-0,5(50) + 10y = 5$$
                         $$-25 + 10y = 5$$
                         $$10y = 30$$
                         $$y = 3$$<br><br>
                         <strong>4. Kết luận</strong><br>
                         Các giá trị \\(x = 50\\) và \\(y = 3\\) đều thỏa mãn điều kiện ban đầu. Vậy, <strong>vận tốc dự định là 50 km/h</strong> và <strong>thời gian dự định là 3 giờ</strong>.`
                },
                {
                    q_id: 'tl_b3',
                    question_text: `<strong>Bài 3 (1 điểm):</strong> Hai người thợ cùng làm một công việc trong 16 giờ thì xong. Nếu người thứ nhất làm trong 3 giờ và người thứ hai làm trong 6 giờ thì chỉ hoàn thành được 25% công việc. Hỏi nếu làm riêng thì mỗi người hoàn thành công việc trong bao lâu?`,
                    model_answer: `<strong>Lời giải chi tiết:</strong><br><br>
                         <strong>1. Thiết lập các ẩn số</strong><br>
                         Gọi \\(x\\) là năng suất của người thứ nhất (N1), tức là lượng công việc N1 làm được trong 1 giờ.<br>
                         Gọi \\(y\\) là năng suất của người thứ hai (N2), tức là lượng công việc N2 làm được trong 1 giờ.<br>
                          Điều kiện: \\(x > 0, y > 0\\).<br><br>
                         <strong>2. Phân tích và lập phương trình từ các dữ kiện</strong><br>
                          <strong>Dữ kiện 1: Làm chung</strong><br>
                         "Hai người thợ cùng làm một công việc trong 16 giờ thì xong."<br>
                         Khi làm chung, tổng năng suất của họ là \\(x + y\\).<br>
                         Vì họ hoàn thành công việc trong 16 giờ, nên năng suất chung này đúng bằng \\(\\frac{1}{16}\\) công việc/giờ.<br>
                         Ta có phương trình thứ nhất: $$x + y = \\frac{1}{16}$$ (I)<br><br>
                          <strong>Dữ kiện 2: Làm một phần</strong><br>
                         "Người thứ nhất làm trong 3 giờ và người thứ hai làm trong 6 giờ thì hoàn thành được 25% công việc."<br>
                         Lượng công việc N1 làm được là: \\(3x\\).<br>
                         Lượng công việc N2 làm được là: \\(6y\\).<br>
                         Tổng lượng công việc họ làm được là 25% (tức là \\(\\frac{1}{4}\\) công việc).<br>
                         Ta có phương trình thứ hai: $$3x + 6y = \\frac{1}{4}$$ (II)<br><br>
                         <strong>3. Giải hệ phương trình</strong><br>
                         Ta có hệ phương trình tuyến tính sau:<br>
                         $$\\begin{cases} x + y = \\frac{1}{16} & \\text{(I)} \\\\ 3x + 6y = \\frac{1}{4} & \\text{(II)} \\end{cases}$$
                         Từ phương trình (I), ta rút ra \\(x = \\frac{1}{16} - y\\). Thế vào phương trình (II):<br>
                         $$3(\\frac{1}{16} - y) + 6y = \\frac{1}{4}$$
                         $$\\frac{3}{16} - 3y + 6y = \\frac{1}{4}$$
                         $$3y = \\frac{1}{4} - \\frac{3}{16}$$
                         $$3y = \\frac{1}{16}$$
                         $$y = \\frac{1}{48}$$
                         Thay giá trị của \\(y\\) trở lại để tìm \\(x\\):<br>
                         $$x = \\frac{1}{16} - \\frac{1}{48} = \\frac{3}{48} - \\frac{1}{48} = \\frac{2}{48} = \\frac{1}{24}$$<br><br>
                         <strong>4. Suy ra thời gian hoàn thành công việc</strong><br>
                          <strong>Thời gian của người thứ nhất:</strong><br>
                         Năng suất là \\(\\frac{1}{24}\\) (công việc/giờ).<br>
                         Thời gian để hoàn thành 1 công việc là: \\(\\frac{1}{1/24} = 24\\) giờ.<br>
                          <strong>Thời gian của người thứ hai:</strong><br>
                         Năng suất là \\(\\frac{1}{48}\\) (công việc/giờ).<br>
                         Thời gian để hoàn thành 1 công việc là: \\(\\frac{1}{1/48} = 48\\) giờ.<br><br>
                         <strong>5. Kết luận</strong><br>
                         Vậy, nếu làm riêng, <strong>người thứ nhất hoàn thành công việc trong 24 giờ</strong>, và <strong>người thứ hai hoàn thành trong 48 giờ</strong>.`
                }
            ]
        }
    ],
    grade10: [
        {
            id: 'lop10_cong_cu_bieu_dien_tap_hop',
            title: 'Công cụ biểu diễn tập hợp',
            type: 'tool',
            url: 'cong-cu-bieu-dien-tap-hop.html',
            description: 'Công cụ tương tác để biểu diễn và so sánh các tập hợp số thực trên trục số'
        }
    ],
    grade11: [],
    grade12: []
};

window.examData = mathData;