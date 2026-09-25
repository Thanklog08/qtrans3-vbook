load('config.js');

function execute(url) {
    url = fixUrl(url);
    var response = fetch(url);
    if (!response.ok) return null;
    var doc = response.html();
    var host = hostOf(url);
    var data = [], seen = {};
    doc.select("#list-chapter ul.list-chapter li a[href]").forEach(function (a) {
        var href = fixUrl(a.attr("href") + "");
        if (!href || seen[href]) return;
        seen[href] = true;
        data.push({ name: (a.text() + "").replace(/\s+/g, " ").trim(), url: href, host: host });
    });
    return Response.success(data);
}
