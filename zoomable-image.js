// ====== ZOOMABLE IMAGE FUNCTIONALITY ======
// Thêm overlay cho phóng to ảnh
const zoomOverlay = document.createElement('div');
zoomOverlay.className = 'zoom-overlay';
document.body.appendChild(zoomOverlay);

// Thêm CSS động nếu cần
const style = document.createElement('style');
style.textContent = `
    /* Zoomable Image Styles */
    img[data-zoomable], 
    img.zoomable {
        cursor: zoom-in;
        transition: transform 0.25s ease;
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1rem 0;
    }
    
    .zoomed-image {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(1.5);
        z-index: 1000;
        max-height: 90vh;
        max-width: 90vw;
        cursor: zoom-out;
        box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
        background: white;
        padding: 15px;
        border-radius: 8px;
        object-fit: contain;
    }
    
    .zoom-overlay {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999;
        cursor: zoom-out;
    }
    
    .zoom-overlay.active {
        display: block;
    }
`;
document.head.appendChild(style);

// Hàm xử lý sự kiện click cho ảnh
function setupZoomableImages() {
    const zoomableImages = document.querySelectorAll('img[data-zoomable], img.zoomable');
    
    zoomableImages.forEach(img => {
        // Đảm bảo mỗi ảnh chỉ được thêm sự kiện một lần
        if (img.getAttribute('data-zoom-initialized') !== 'true') {
            img.setAttribute('data-zoom-initialized', 'true');
            
            img.addEventListener('click', function(e) {
                e.stopPropagation();
                
                if (this.classList.contains('zoomed-image')) {
                    // Nếu đang zoom, trở về trạng thái ban đầu
                    this.classList.remove('zoomed-image');
                    zoomOverlay.classList.remove('active');
                    this.style.cursor = 'zoom-in';
                } else {
                    // Nếu chưa zoom, phóng to ảnh
                    this.classList.add('zoomed-image');
                    zoomOverlay.classList.add('active');
                    this.style.cursor = 'zoom-out';
                }
            });
        }
    });
}

// Thêm sự kiện click cho overlay để đóng ảnh
zoomOverlay.addEventListener('click', function() {
    const zoomedImage = document.querySelector('.zoomed-image');
    if (zoomedImage) {
        zoomedImage.classList.remove('zoomed-image');
        this.classList.remove('active');
    }
});

// Thêm sự kiện ESC để đóng ảnh
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        const zoomedImage = document.querySelector('.zoomed-image');
        if (zoomedImage) {
            zoomedImage.classList.remove('zoomed-image');
            zoomOverlay.classList.remove('active');
        }
    }
});

// Gọi hàm setupZoomableImages mỗi khi nội dung thay đổi
const observer = new MutationObserver(function(mutations) {
    setupZoomableImages();
});

// Bắt đầu quan sát thay đổi trong body
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Gọi lần đầu khi tải trang
document.addEventListener('DOMContentLoaded', setupZoomableImages);

// Gọi lại sau khi tải xong tất cả tài nguyên
window.addEventListener('load', setupZoomableImages);
