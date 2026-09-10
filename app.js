const form = document.getElementById("userForm");
const result = document.getElementById("result");

form.addEventListener("submit", async function(event) {

    event.preventDefault();

    result.textContent = "Sending request to ServiceNow...";

    const instance =
        document.getElementById("instance").value.replace(/\/$/, "");

    const apiUsername =
        document.getElementById("apiUsername").value;

    const apiPassword =
        document.getElementById("apiPassword").value;

    const username =
        document.getElementById("username").value;

    const firstName =
        document.getElementById("firstName").value;

    const lastName =
        document.getElementById("lastName").value;

    const email =
        document.getElementById("email").value;


    /*
        CHANGE THIS after we create the
        Scripted REST API in ServiceNow.
    */

    const apiPath =
        "/api/2209290/account_provisioning_api";


    const payload = {

        user_name: username,

        first_name: firstName,

        last_name: lastName,

        email: email
    };


    try {

        const response = await fetch(
            instance + apiPath,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

                    "Accept": "application/json",

                    "Authorization":
                        "Basic " +
                        btoa(apiUsername + ":" + apiPassword)
                },

                body: JSON.stringify(payload)
            }
        );


        const data = await response.json();


        if (!response.ok) {

            result.textContent =
                "ServiceNow returned an error:\n\n" +
                JSON.stringify(data, null, 2);

            return;
        }


        result.textContent =
            "Account created successfully!\n\n" +
            JSON.stringify(data, null, 2);

    }

    catch (error) {

        result.textContent =
            "Connection failed:\n\n" +
            error.message;

    }

});
