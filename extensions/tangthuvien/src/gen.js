load('config.js');

function execute(url, page) {
    if (!page) page = '1';
    var response = fetch(withPage(url, page));
    if (!response.ok) return null;
    var doc = response.html();
    return Response.success(parseList(doc), nextPage(doc, page));
}
