# Xác suất biến cố

> Chủ đề 12

## Các dạng toán trọng tâm
## Dạng 1. Liệt kê các kết quả có thể xảy ra của một phép thử ngẫu nhiên
- Phương pháp giải: Dạng toán này là dạng toán xác định không gian mẫu của phép thử và đếm số lượng các kết quả có thể xảy ra. Đây là bước làm quan trọng của một số bài toán xác suất. Để giải quyết được dạng toán này, các em cần chú ý liệt kê các đối tượng một cách có trình tự để tránh nhầm lẫn (đếm thiếu, đếm thừa).
Chú ý: Trong một số bài toán có số lượng liệt kê lớn, chúng ta có thể giải quyết bài toán với các tham số nhỏ hơn, từ đó tìm được quy luật cũng như các phép tính cần thiết để giải quyết trong trường hợp tham số mà bài toán yêu cầu.
### Ví dụ 1.
Có hai rổ chứa bóng. Rổ thứ nhất chứa 5 quả bóng được đánh số lần lượt từ 1 đến 5. Rổ thứ hai chứa 2 quả bóng được đánh chữ cái A, B. Mi lấy ra ngẫu nhiên một quả bóng trong mỗi rổ. Hỏi phép thử của bạn Mi có bao nhiêu kết quả có thể xảy ra?
**Ví dụ giải:**
Chúng ta có thể lập bảng như sau:
\begin{tabular}{|c|c|c|c|c|c|} \hline Chữ cái & Số & & & & \\ \hline & 1 & 2 & 3 & 4 & 5 \\ \hline A & A1 & A2 & A3 & A4 & A4 \\ \hline B & B1 & B2 & B3 & B4 & B5 \\ \hline \end{tabular}
Như vậy, chúng ta thấy được có 10 kết quả có thể xảy ra đối với phép thử của bạn Mi.
### Ví dụ 2.
Hai bạn An và Bình chơi một trò chơi như sau: An chọn ngẫu nhiên một số tự nhiên trong khoảng từ 1 đến 100. Bình phải đoán xem An đã chọn số nào. Giả sử rằng Bình đã đoán ngẫu nhiên một số tự nhiên trong khoảng từ 1 đến 100. Hỏi không gian mẫu của phép thử đối với bộ hai số mà An và Bình đã chọn có bao nhiêu kết quả?
**Ví dụ giải:**
Dễ thấy được về mô hình bài toán trong ví dụ này và Ví dụ 1 là như nhau. Do vậy chúng ta dễ dàng lập được một bảng tương ứng biểu diễn các kết quả có thể xảy ra. Tuy nhiên bảng này có kích thước rất lớn, do vậy thay vì vẽ bảng, chúng ta có thể hình dung kích thước của bảng và từ đó tìm được số lượng các kết quả có thể xảy ra.
Bảng này có 100 cột biểu diễn cho 100 khả năng chọn số của An và có 100 hàng biểu diễn cho 100 khả năng chọn số của Bình. Mỗi ô trong bảng là một kết quả có thể xảy ra, do đó không gian mẫu của phép thử có số lượng kết quả là 100 $\cdot $ 100 = 10 000 kết quả.
## Dạng 2. Liệt kê các kết quả thuận lợi, xác định xác suất xảy ra của một biến cố
- Phương pháp giải: Cũng giống như dạng toán trước, ở dạng toán này các em cũng cần phải liệt kê (các kết quả thuận lợi). Như vậy cách làm của dạng toán này cũng có nhiều điểm
giống dạng toán trước. Tuy nhiên trong một số trường hợp, việc liệt kê, đếm các kết quả thuận lợi không đơn giản. Khi đó các em có thể đếm bằng cách loại trừ các kết quả không thuận lợi cho biến cố.
### Ví dụ 3.
Dưới đây là hình vẽ mô tả một con quay đồng chất được chia thành 12 phần bằng nhau, các phần được đánh số lần lượt 1, 2, 3, ..., 12. Xét phép thử ``quay đĩa tròn một lần'', hãy tính xác suất của biến cố: ``Chiếc kim chỉ vào hình quạt ghi số chia hết cho 3''.
**Ví dụ giải:**
Dễ thấy được không gian mẫu của phép thử là 12. Số kết quả thuận lợi có thể liệt kê được là: 3, 6, 9 và 12.
Vậy xác suất của biến cố: ``Chiếc kim chỉ vào hình quạt ghi số chia hết cho 3'' là: $ 4 : 12 = \frac{1}{3}$.
### Ví dụ 4.
Dưới đây là hình vẽ mô tả một con quay đồng chất được chia thành 12 phần bằng nhau, các phần được đánh số lần lượt 1, 2, 3, ..., 12. Xét phép thử ``quay đĩa tròn hai lần'', hãy tính xác suất của biến cố: ``Tích hai số nhận được chia hết cho 5''.
**Ví dụ giải:**
Không gian mẫu của phép thử là $ 12 \cdot 12 = 144 $. Để tích hai số nhận được chia hết cho 5 thì một trong hai kết quả (hoặc cả 2 kết quả) là số chia hết cho 5, cụ thể là 5 hoặc 10.
- Nếu lần quay 1 được số 5 hoặc 10, chúng ta có 24 kết quả thuận lợi.
- Nếu lần quay 2 được số 5 hoặc 10, chúng ta có 24 kết quả thuận lợi.
- Nếu cả 2 lần quay được 5 hoặc 10, chúng ta có 4 kết quả thuận lợi.
Như vậy số kết quả thuận lợi là $ 24 + 24 - 4 = 44 $ kết quả.
Vậy xác suất của biến cố: ``Tích hai số nhận được chia hết cho 5'' là: $\frac{44}{144} = \frac{11}{36}$.
Tuy nhiên ở bài toán này, chúng ta có thể đếm số lượng kết quả không thuận lợi như sau: Để tích hai số nhận được không chia hết cho 5 thì hai số nhận được đều không chia hết cho 5. Số thứ nhất có 10 kết quả thích hợp (1, 2, 3, 4, 6, 7, 8, 9, 11, 12), số thứ hai cũng có 10 kết quả thích hợp. Như vậy số kết quả không thuận lợi là $ 10 \cdot 10 = 100 $. Dẫn tới số kết quả thuận lợi là $ 144 - 100 = 44 $.
Vậy xác suất tính được là: $\frac{44}{144} = \frac{11}{36}$.
### Ví dụ 5.
Một con cào cào đang đứng tại chiếc lá $ A $. Nó thực hiện liên tiếp 4 bước nhảy, mỗi bước sẽ nhảy vào ngẫu nhiên một trong ba chiếc lá còn trống. Hãy tính xác suất để sau bước thứ 4, con cào cào quay lại chiếc lá $ A $.
**Ví dụ giải:**
Mỗi bước con cào cào có 3 cách thực hiện bước nhảy (nhảy vào 1 trong 3 lá trống). Do đó con cào cào có tất cả $ 3^4 = 81 $ cách thực hiện 4 bước nhảy liên tiếp.
Bây giờ, giả sử tại bước đầu tiên, con cào cào nhảy vào chiếc lá B chúng ta sẽ liệt kê các cách nhảy của cào cào để sau 4 bước, nó quay trở lại chiếc lá A:
\[
A \rightarrow B \rightarrow A \rightarrow B \rightarrow A \qquad A \rightarrow B \rightarrow A \rightarrow C \rightarrow A \\
A \rightarrow B \rightarrow A \rightarrow D \rightarrow A \qquad A \rightarrow B \rightarrow C \rightarrow B \rightarrow A \\
A \rightarrow B \rightarrow C \rightarrow D \rightarrow A \qquad A \rightarrow B \rightarrow D \rightarrow B \rightarrow A \\
\]
A \rightarrow B \rightarrow D \rightarrow C \rightarrow A
Tương tự nếu bước nhảy đầu tiên con cào cào nhảy vào lá C hoặc D, nó có thêm $ 7 + 7 = 14 $ cách nhảy thuận lợi để quay về lá A.
Như vậy xác suất để con cào cào quay lại chiếc lá A sau 4 bước nhảy là $\frac{21}{81} = \frac{7}{27}$.
