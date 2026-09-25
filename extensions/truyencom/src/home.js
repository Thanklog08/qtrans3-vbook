load('config.js');

function execute() {
    return Response.success([
        { title: "Mới cập nhật", input: BASE_URL + "/truyen-moi-cap-nhat/", script: "gen.js" },
        { title: "Mới đăng", input: BASE_URL + "/truyen-moi-dang/", script: "gen.js" },
        { title: "Truyện hot", input: BASE_URL + "/truyen-hot/", script: "gen.js" },
        { title: "Truyện full", input: BASE_URL + "/truyen-full/", script: "gen.js" }
    ]);
}
