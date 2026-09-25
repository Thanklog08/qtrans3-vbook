load('config.js');

// Mục lục chia trang 50 chương: <truyện>/trang-N/#chapter-list. Trả một URL cho mỗi trang.
function execute(url) {
    url = fixUrl(url).replace(/[?#].*$/, "").replace(/trang-\d+\/?$/, "");
    if (url.slice(-1) !== "/") url += "/";
    var response = fetch(url);
    if (!response.ok) return null;
    var last = lastPage(response.html());
    var pages = [url];
    for (var p = 2; p <= last; p++) pages.push(url + "trang-" + p + "/");
    return Response.success(pages);
}
