load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    var fullUrl = fixUrl(url);
    fullUrl = fullUrl.indexOf("page=") !== -1
        ? fullUrl.replace(/page=\d+/, "page=" + page)
        : fullUrl + (fullUrl.indexOf("?") > -1 ? "&" : "?") + "page=" + page;

    var response = fetch(fullUrl);
    if (!response.ok) return null;
    var doc = response.html();
    return Response.success(parseList(doc), nextPage(doc, page));
}
