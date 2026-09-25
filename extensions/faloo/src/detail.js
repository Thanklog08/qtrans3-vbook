load('config.js');

function execute(url) {
    var id = bookId(url);
    if (!id) return null;
    var doc = getDoc(BASE_URL + "/" + id + ".html");
    if (!doc) return null;
    var info = doc.select(".infoLayout .info");

    var authorLink = info.select("a[href*='t=2']");
    var author = (authorLink.text() + "").trim();
    var catLink = info.select("a[href*='/y_']");
    var category = (catLink.text() + "").trim();
    var status = (info.select("i.tag").text() + "").trim();
    var lines = [];
    info.select("li").forEach(function (li) { lines.push((li.text() + "").replace(/\s+/g, " ").trim()); });

    var detail = [];
    if (author) detail.push("作者: " + author);
    if (category) detail.push("分类: " + category);
    if (status) detail.push("状态: " + status);
    lines.forEach(function (t) {
        if (/万字|更新时间|分\s*\//.test(t)) detail.push(t);
    });
    var tags = [];
    doc.select(".tagList a.tag2").forEach(function (a) { tags.push((a.text() + "").trim()); });
    if (tags.length) detail.push("标签: " + tags.join(", "));

    var genres = [];
    if (catLink.size() > 0) genres.push({ title: category, input: fixUrl(catLink.first().attr("href") + ""), script: "gen.js" });
    var suggests = [];
    if (authorLink.size() > 0) suggests.push({ title: "同作者", input: fixUrl(authorLink.first().attr("href") + ""), script: "gen.js" });

    return Response.success({
        name: (doc.select(".infoLayout h1.name").text() + "").trim(),
        cover: fixUrl(doc.select(".cover_box img.cover").attr("src") + ""),
        author: author,
        description: doc.select("#novel_intro").html() + "",
        detail: detail.join("<br>"),
        ongoing: status.indexOf("完") < 0,
        genres: genres,
        suggests: suggests,
        host: BASE_URL
    });
}
