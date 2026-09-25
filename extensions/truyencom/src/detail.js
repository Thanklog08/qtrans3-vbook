load('config.js');

function execute(url) {
    url = fixUrl(url);
    var response = fetch(url);
    if (!response.ok) return null;
    var doc = response.html();
    var host = hostOf(url);
    var info = doc.select(".col-info-desc");

    var author = (info.select("a[itemprop=author]").text() + "").trim();
    var status = (info.select(".info .text-success, .info .text-primary").text() + "").trim();
    var genres = [];
    info.select("a[itemprop=genre]").forEach(function (a) {
        genres.push({ title: (a.text() + "").trim(), input: fixUrl(a.attr("href") + ""), script: "gen.js" });
    });
    var rating = (info.select("[itemprop=ratingValue]").text() + "").trim();
    var votes = (info.select("[itemprop=ratingCount]").text() + "").trim();

    var detail = [];
    if (author) detail.push("Tác giả: " + author);
    if (status) detail.push("Trạng thái: " + (status === "Full" ? "Hoàn thành" : status));
    if (genres.length) detail.push("Thể loại: " + genres.map(function (g) { return g.title; }).join(", "));
    if (rating) detail.push("Đánh giá: " + rating + "/10" + (votes ? " (" + votes + " lượt)" : ""));

    var suggests = [];
    var authorLink = info.select("a[itemprop=author]");
    if (authorLink.size() > 0) suggests.push({ title: "Cùng tác giả", input: fixUrl(authorLink.first().attr("href") + ""), script: "gen.js" });

    return Response.success({
        name: (info.select("h1.title").text() + "").trim(),
        cover: fixUrl(info.select("img[itemprop=image]").attr("src") + ""),
        author: author,
        description: info.select(".desc-text").html() + "",
        detail: detail.join("<br>"),
        ongoing: status !== "Full",
        genres: genres,
        suggests: suggests,
        host: host
    });
}
