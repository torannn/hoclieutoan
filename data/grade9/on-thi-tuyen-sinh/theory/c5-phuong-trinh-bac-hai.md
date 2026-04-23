# Phương trình bậc hai một ẩn

> Chủ đề 5

## Các dạng toán trọng tâm
## Dạng 1. Giải phương trình $ ax^2 + bx + c = 0 $ ($ a \neq 0 $)
- Phương pháp giải: Sử dụng công thức nghiệm hoặc công thức nghiệm thu gọn.
Chú ý: Tùy từng phương trình cụ thể, có thể giải bằng cách đưa về phương trình tích.
### Ví dụ 1.
Dùng công thức nghiệm của phương trình bậc hai để giải các phương trình sau:
a) $ 3x^2 - 7x + 2 = 0 $;
b) $ 2x^2 + x + 5 = 0 $.
**Ví dụ giải:**
a) Phương trình bậc hai $ 3x^2 - 7x + 2 = 0 $ có: $ a = 3; b = -7; c = 2; \Delta = b^2 - 4ac = (-7)^2 - 4.3.2 = 25 > 0 $.
Áp dụng công thức nghiệm, phương trình có hai nghiệm phân biệt là:
\[
x_1 = \frac{-b - \sqrt{\Delta}}{2a} = \frac{7 + \sqrt{25}}{2.3} = 2; \quad x_2 = \frac{-b - \sqrt{\Delta}}{2a} = \frac{7 - \sqrt{25}}{2.3} = \frac{1}{3}
\]
Vậy phương trình có hai nghiệm là 2 và $ \frac{1}{3} $.
b) Phương trình bậc hai $ 2x^2 + x + 5 = 0 $ có: $ a = 2; b = 1; c = 5; \Delta = b^2 - 4ac = 1^2 - 4.5.2 = -39 < 0 $.
Vậy phương trình vô nghiệm.
## Dạng 2. Kiểm tra một giá trị $ x_0 $ có là nghiệm của phương trình $ ax^2 + bx + c = 0 $ ($ a \neq 0 $) hay không
- Phương pháp giải: Thay giá trị $ x_0 $ vào về trái của phương trình và tính giá trị biểu thức $ ax_0^2 + bx_0 + c $. Nếu kết quả biểu thức bằng 0 thì $ x_0 $ là một nghiệm của phương trình.
### Ví dụ 2.
Trong các giá trị sau của x, giá trị nào là nghiệm của phương trình $ 3x^2 + 7x + 2 = 0 $?
a) $ x = -2 $;
b) $ x = 3 $.
**Ví dụ giải:**
a) Thay $ x = -2 $ vào về phải của phương trình, ta được $ 3.(-2)^2 + 7.(-2) + 2 = 0 $. Vậy $ x = -2 $ là một nghiệm của phương trình.
b) Thay $ x = 3 $ vào về phải của phương trình, ta được $ 3.3^2 + 7.3 + 2 = 50 \neq 0 $. Vậy $ x = 3 $ không là nghiệm của phương trình.
## Dạng 3. Tìm nghiệm còn lại khi biết trước một nghiệm $ x_0 $ của phương trình
- Phương pháp giải: Thực hiện theo các bước:
- **Bước 1:** Thay giá trị $ x_0 $ vào phương trình để tìm tham số.
- **Bước 2:** Thay giá trị của tham số vào phương trình để tìm nghiệm còn lại và kết luận. (Hoặc vận dụng định lí Viète để tìm nghiệm còn lại và kết luận).
### Ví dụ 3.
Cho phương trình $ x^2 + (2m + 1)x + 3m = 0 $ ($ m $ là tham số) có một nghiệm là $ x_1 = -2 $. Tìm nghiệm còn lại (nếu có) của phương trình đã cho.
**Ví dụ giải:**
Phương trình $ x^2 + (2m + 1)x + 3m = 0 $ ($ m $ là tham số) có một nghiệm là $ x_1 = -2 $ nên $ (-2)^2 + (2m + 1)(-2) + 3m = 0 $, hay $ 2 - m = 0 $, vậy $ m = 2 $.
Với $ m = 2 $ ta có phương trình $ x^2 + (2.2 + 1)x + 3.2 = 0 $ hay $ x^2 + 5x + 6 = 0 $.
Giải phương trình $ x^2 + 5x + 6 = 0 $ ta được nghiệm còn lại $ x_2 = -3 $.
(Hoặc theo định lí Viète, ta có $ x_1 x_2 = \frac{c}{a} = \frac{3m}{1} = 3m = 6 $. Do $ x_1 = -2 $ nên nghiệm còn lại $ x_2 = -3 $).
## Dạng 4. Tính giá trị biểu thức đối xứng giữa các nghiệm $ x_1 $ và $ x_2 $ của phương trình bậc hai
(Biểu thức giữa $ x_1, x_2 $ gọi là đối xứng nếu ta thay $ x_1 $ bởi $ x_2 $ và $ x_2 $ bởi $ x_1 $ thì giá trị biểu thức không thay đổi).
- Phương pháp giải: Thực hiện theo các bước:
- **Bước 1:** Tính biểu thức $ \Delta $ để xác định phương trình đã cho có hai nghiệm $ x_1, x_2 $.
- **Bước 2:** Từ định lí Viète tính được $ S $ và $ P $ (tổng và tích của các nghiệm).
- **Bước 3:** Biểu diễn biểu thức đối xứng qua $ S $ và $ P $ rồi thay giá trị của $ S $ và $ P $ ta tính được giá trị của biểu thức đó.
### Ví dụ 4.
Giả sử $ x_1, x_2 $ là hai nghiệm của phương trình $ x^2 + \sqrt{7}x + 1 = 0 \ (*) $. Không giải phương trình, hãy tính:
a) $ \frac{3}{x_1} + \frac{3}{x_2} $;
b) $ x_1^3 + x_2^3 $.
**Ví dụ giải:**
Ta có $ \Delta = (\sqrt{7})^2 - 4.1.1 = 3 > 0 $. Do đó phương trình (*) có hai nghiệm phân biệt $ x_1, x_2 $.
Theo định lí Viète, ta có: $ S = x_1 + x_2 = \frac{-b}{a} = -\sqrt{7} $; $ P = x_1 \cdot x_2 = \frac{c}{a} = 1 $.
a) $ \frac{3}{x_1} + \frac{3}{x_2} = \frac{3(x_1 + x_2)}{x_1 x_2} = \frac{3(-\sqrt{7})}{1} = -3\sqrt{7} $;
b) $ x_1^3 + x_2^3 = (x_1 + x_2)^3 - 3x_1 x_2 (x_1 + x_2) = (-\sqrt{7})^3 - 3(-\sqrt{7}).1 = -4\sqrt{7} $.
## Dạng 5*. Xác định giá trị của tham số m để phương trình bậc hai một ẩn có nghiệm (vô nghiệm)
- Phương pháp giải: Đưa phương trình đã cho (có tham số m) về dạng $ ax^2 + bx + c = 0 $.
Xét hai trường hợp:
Trường hợp 1: Xét $ a = 0 $ (khi hệ số a có chứa tham số). Khi đó tính được giá trị của tham số m, phương trình đã cho trở thành phương trình bậc nhất một ẩn. Giải phương trình bậc nhất một ẩn để tìm nghiệm của phương trình đã cho.
Trường hợp 2: Xét $ a \neq 0 $. Tính $ \Delta $. Từ yêu cầu về phương trình bậc hai đã cho có nghiệm (nghiệm kép hoặc hai nghiệm phân biệt hoặc vô nghiệm) dẫn đến việc giải bất phương trình $ \Delta \geq 0 $ ($ \Delta = 0; \; \Delta > 0; \; \Delta < 0 $).
Chú ý: Chỉ sử dụng các phương trình mà khi tìm điều kiện của $ \Delta $ dẫn đến giải phương trình, bất phương trình bậc nhất một ẩn.
### Ví dụ 5*. Hãy tìm giá trị của m để phương trình sau có nghiệm: $ mx^2 + (2m - 1)x + m + 3 = 0 $.
**Ví dụ giải:**
Xét phương trình $ mx^2 + (2m - 1)x + m + 3 = 0 $ (1).
Nếu $ m = 0 $ thì phương trình (1) trở thành $ -x - 3 = 0 $ hay $ x = 3 $.
Nếu $ m \neq 0 $: Phương trình (1) có nghiệm khi $ \Delta \geq 0 $.
Ta có: $ \Delta = (2m - 1)^2 - 4m(m + 3) = 4m^2 - 4m + 1 - 4m^2 + 12m = 8m + 1 $.
$ \Delta \geq 0 $ tức là $ 8m + 1 \geq 0 $, hay $ m \geq \frac{-1}{8} $.
Vậy khi $ m \geq \frac{-1}{8}, \; m \neq 0 $ thì phương trình đã cho có nghiệm.
## Dạng 6. Áp dụng hệ thức Viète để tính nhầm nghiệm của phương trình bậc hai
- Phương pháp giải: Vận dụng nhận xét: Cho phương trình bậc hai $ ax^2 + bx + c = 0 $ ($ a \neq 0 $).
- Nếu $ a + b + c = 0 $ thì phương trình có nghiệm $ x_1 = 1 $ và $ x_2 = \frac{c}{a} $.
- Nếu $ a - b + c = 0 $ thì phương trình có nghiệm $ x_1 = -1 $ và $ x_2 = \frac{-c}{a} $.
### Ví dụ 6.
Nhầm nghiệm của các phương trình sau:
a) $ x^2 - 4x + 3 = 0 $;
b) $ x^2 + 4x + 3 = 0 $.
**Ví dụ giải:**
a) Ta có: $ 1 + (-4) + 3 = 0 $. Do đó phương trình có hai nghiệm $ x_1 = 1; \; x_2 = \frac{c}{a} = \frac{3}{1} = 3 $.
b) Ta có: $ 1 - 4 + 3 = 0 $. Do đó phương trình có hai nghiệm $ x_1 = -1; \; x_2 = \frac{-c}{a} = \frac{-3}{1} = -3 $.
## Dạng 7. Tìm hai số khi biết tổng và tích
- Phương pháp giải: Vận dụng nhận xét: Nếu hai số u và v có tổng $ u + v = S $ và tích $ uv = P $ thì hai số đó là nghiệm của phương trình $ x^2 - Sx + P = 0 $. Điều kiện để có u và v là $ S^2 - 4P \geq 0 $.
### Ví dụ 7.
Tìm hai số u và v thoả mãn $ u + v = 5; uv = 6 $.
**Ví dụ giải:**
a) Ta có u và v là hai nghiệm của phương trình $ x^2 - 5x + 6 = 0 $. Giải phương trình trên, ta được: $ x_1 = 2; x_2 = 3 $. Vậy $ u = 2; v = 3 $ hoặc $ u = 3; v = 2 $.
## Dạng 8. Giải bài toán bằng cách lập phương trình
- Phương pháp giải: Thực hiện theo các bước giải một bài toán bằng cách lập phương trình:
- **Bước 1:** Lập phương trình (Chọn ẩn số và đặt điều kiện thích hợp cho ẩn số; Biểu diễn các đại lượng chưa biết theo ẩn và các đại lượng đã biết; Lập phương trình biểu thị mối quan hệ giữa các đại lượng).
- **Bước 2:** Giải phương trình vừa lập được.
- **Bước 3:** Kiểm tra xem trong các nghiệm vừa lập của phương trình, nghiệm nào thỏa mãn điều kiện của ẩn, nghiệm nào không thỏa mãn rồi kết luận.
### Ví dụ 8.
Một toà nhà có kế hoạch sử dụng một máy bơm để bơm đầy nước vào một bể cạn nước có dung tích 120 m $^3 $ trong một thời gian dự định. Khi thực hiện, người vận hành điều chỉnh cho lưu lượng bơm tăng thêm 2 m $^3 $/giờ so với kế hoạch nên đã bơm đầy bể sớm hơn dự định 2 giờ. Tính lưu lượng bơm (số mét khối nước bơm trong mỗi giờ) theo kế hoạch.
**Ví dụ giải:**
Gọi lưu lượng bơm theo kế hoạch là x (m $^3 $/giờ ) ($ x > 0 $). Khi đó lưu lượng bơm trên thực tế là $ x + 2 $ (m $^3 $/giờ ).
Thời gian dự định bơm đầy bể là $ \frac{120}{x} $ (giờ);
Thời gian thực tế để bơm đầy bể là: $ \frac{120}{x + 2} $ (giờ).
Vì bơm đầy bể sớm hơn dự định 2 giờ nên ta có phương trình: $ \frac{120}{x} - 2 = \frac{120}{x + 2} $.
Hay $ x^2 + 2x - 120 = 0 $. Giải phương trình ta được $ x_1 = 10 $ (thỏa mãn); $ x_2 = -12 $ (loại). Vậy lưu lượng bơm theo kế hoạch là 10 m $^3 $/giờ.
