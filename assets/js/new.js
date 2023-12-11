$(document).ready(function () {
    // When the user types in the search box
    $("#name-search").on("keyup", function () {
        var searchText = $(this).val().toLowerCase();

        // Loop through each table row
        $("table tbody tr").each(function () {
            var userName = $(this).find("td:eq(1)").text().toLowerCase(); // Get the user's name in lowercase
            var email = $(this).find("td:eq(2)").text().toLowerCase();
            var number = $(this).find("td:eq(0)").text().toLowerCase();

            // If the user's name contains the search text, show the row; otherwise, hide it
            if (userName.includes(searchText)) {
                $(this).show();
            } else if (email.includes(searchText)) {
                $(this).show();
            }else if (number.includes(searchText)) {
                $(this).show();
            }else{
                $(this).hide();
            }
        });
    });
});