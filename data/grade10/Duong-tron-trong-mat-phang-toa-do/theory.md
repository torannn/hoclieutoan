## I. TÓM TẮT LÝ THUYẾT

### 1. Phương trình đường tròn
**Dạng 1. Phương trình đường tròn $(C)$ có tâm $I(a;b)$, bán kính $R > 0$:**
$$
(x-a)^2 + (y-b)^2 = R^2
$$

**Dạng 2. Phương trình tổng quát:**
$$
x^2 + y^2 - 2ax - 2by + c = 0 \quad (*)
$$
Đường tròn có tâm $I(a;b)$, bán kính $R = \sqrt{a^2 + b^2 - c}$.
*Lưu ý:* Điều kiện để (*) là phương trình của một đường tròn là: $a^2 + b^2 - c > 0$.

---

### 2. Tiếp tuyến của đường tròn: $x^2 + y^2 - 2ax - 2by + c = 0$

**a) Tiếp tuyến của $(C)$ tại $M_0(x_0; y_0)$** (với $M_0$ là tiếp điểm)
Tiếp tuyến của $(C)$ tại $M_0(x_0; y_0)$ có phương trình:
$$
xx_0 + yy_0 - a(x + x_0) - b(y + y_0) + c = 0
$$
*(Công thức phân đôi toạ độ)*

**Nhận xét:** Rõ ràng tiếp tuyến $\Delta$ đi qua $M_0(x_0; y_0)$ và có 1 vectơ pháp tuyến $\overrightarrow{IM_0} = (x_0 - a; y_0 - b)$. Ta có thể viết nhanh phương trình:
$$
\Delta: \quad (x_0 - a)(x - x_0) + (y_0 - b)(y - y_0) = 0
$$

**b) Điều kiện tiếp xúc:**
Đường thẳng $\Delta: ax + by + c = 0$ là tiếp tuyến của $(C) \Leftrightarrow d(I, \Delta) = R$.

**Lưu ý:** Để tiện trong việc tìm phương trình tiếp tuyến của $(C)$, chúng ta không nên xét phương trình đường thẳng dạng $y = kx + m$ (tồn tại hệ số góc $k$). Vì như thế dẫn đến sót trường hợp tiếp tuyến thẳng đứng $x = C$ (không có hệ số góc).

**Nhắc lại:**
* Đường thẳng $y = kx + m$ có hệ số góc $k$.
* Đường thẳng $x = C$ (vuông góc $Ox$) không có hệ số góc.

Do đó, trong quá trình viết phương trình tiếp tuyến với $(C)$ từ 1 điểm $M_0(x_0; y_0)$ (nằm ngoài $(C)$), ta có thể thực hiện bằng 2 phương pháp:

* **Phương pháp 1:** Gọi đường thẳng bất kì qua $M_0(x_0; y_0)$ và có hệ số góc $k$:
$$
y - y_0 = k(x - x_0)
$$
Áp dụng điều kiện tiếp xúc, giải được $k$.
  * Nếu kết quả cho 2 hệ số góc $k$ (tương ứng 2 tiếp tuyến), bài toán giải quyết xong.
  * Nếu chỉ giải được 1 hệ số góc $k$, thì xét thêm đường thẳng $x = x_0$ (đây là tiếp tuyến thứ hai).

* **Phương pháp 2:** Gọi $\vec{n}(a;b)$ (với $a^2 + b^2 > 0$) là 1 vectơ pháp tuyến của đường thẳng $\Delta$ đi qua $M_0(x_0; y_0)$:
$$
a(x - x_0) + b(y - y_0) = 0
$$
Áp dụng điều kiện tiếp xúc, ta được 1 phương trình đẳng cấp bậc hai theo $a, b$.

**Nhận xét:** Phương pháp 2 tỏ ra hiệu quả và khoa học hơn, không bị sót nghiệm.

---

### 3. Vị trí tương đối của hai đường tròn - Số tiếp tuyến chung
Cho hai đường tròn $(C_1)$ có tâm $I_1$, bán kính $R_1$ và $(C_2)$ có tâm $I_2$, bán kính $R_2$.

| Trường hợp | Kết luận | Số tiếp tuyến chung |
| :--- | :--- | :---: |
| $I_1I_2 > R_1 + R_2$ | $(C_1)$ và $(C_2)$ không cắt nhau (nằm ngoài nhau) | 4 |
| $I_1I_2 = R_1 + R_2$ | $(C_1)$ tiếp xúc ngoài với $(C_2)$ | 3 |
| $\|R_1 - R_2\| < I_1I_2 < R_1 + R_2$ | $(C_1)$ cắt $(C_2)$ tại hai điểm phân biệt | 2 |
| $I_1I_2 = \|R_1 - R_2\|$ | $(C_1)$ tiếp xúc trong với $(C_2)$ | 1 |