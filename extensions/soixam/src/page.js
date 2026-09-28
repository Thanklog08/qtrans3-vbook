load('config.js');

// Mục lục một trang (POST /catalog trả hết).
function execute(url) {
    return Response.success([String(url)]);
}
