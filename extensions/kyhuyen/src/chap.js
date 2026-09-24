load('config.js');

function execute(url) {
    var response = fetch(fixUrl(url));
    if (!response.ok) return null;
    var doc = response.html();
    var article = doc.select("article").first();
    if (!article) return null;
    // Giữa bài có quảng cáo (script/style/div) và watermark đầu đoạn, chương dùng <p> hoặc <br>:
    // <a href="https://kyhuyen.com"><span class="d-none">kyhuyen com</span></a>. Câu truyện…
    // <br><span class="d-none">kyhuyen</span>. <br>  ·  <br><a href="https://kyhuyen.com">KyHuyen.com</a>. Câu…
    article.select("script, style, noscript, iframe, ins, div, .d-none, a").remove();
    var html = article.html()
        .replace(/<!--[\s\S]*?-->/g, "")
        // Dấu chấm còn lại của watermark ở đầu dòng; không đụng "..." hay số thập phân.
        .replace(/(^|<p[^>]*>|<br\s*\/?>)(?:\s|&nbsp;)*\.(?![.\w])(?:\s|&nbsp;)*/g, "$1")
        .replace(/<p[^>]*>\s*<\/p>/g, "")
        .replace(/ƣ/g, "ư")
        .replace(/ⓚ|к/g, "k")
        .replace(/ⓒ/g, "c");
    return Response.success(html);
}
