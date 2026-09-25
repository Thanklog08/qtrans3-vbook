load('config.js');

// /tim-kiem/?tukhoa=… trả tối đa 25 truyện, không phân trang (tham số trang bị bỏ qua).
function execute(key, page) {
    if (page && parseInt(page) > 1) return Response.success([], null);
    var response = fetch(BASE_URL + "/tim-kiem/?tukhoa=" + encodeURIComponent(key));
    if (!response.ok) return null;
    return Response.success(parseList(response.html()), null);
}
