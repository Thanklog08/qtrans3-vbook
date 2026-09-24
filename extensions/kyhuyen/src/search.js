load('config.js');

function execute(key, page) {
    if (!page) page = '1';
    var response = fetch(BASE_URL + "/tim-kiem?q=" + encodeURIComponent(key) + "&page=" + page, {
        headers: { "referer": BASE_URL + "/tim-kiem" }
    });
    if (!response.ok) return null;
    var doc = response.html();
    return Response.success(parseList(doc), nextPage(doc, page));
}
