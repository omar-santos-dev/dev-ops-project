const form = document.getElementById("userForm");
const result = document.getElementById("result");

const API_PATH =
    "/api/2209290/account_provisioning_api/create";

form.addEventListener("submit", async (event) => {

    event.preventDefault();

    const instance = document
        .getElementById("instance")
        .value
        .trim()
        .replace(/\/+$/, "");

    const apiUsername = document
        .getElementById("apiUsername")
        .value
        .trim();

    const apiPassword = document
        .getElementById("apiPassword")
        .value;

    const tempPassword = document
        .getElementById("tempPassword")
        .value;

    const confirmPassword = document
        .getElementById("confirmPassword")
        .value;

    // ---------------------------------
    // Validate passwords
    // ---------------------------------

    if (tempPassword !== confirmPassword) {

        result.textContent =
            "ERROR: Temporary passwords do not match.";

        return;
    }

    if (tempPassword.length < 8) {

        result.textContent =
            "ERROR: Temporary password must be at least 8 characters.";

        return;
    }

    // ---------------------------------
    // Build request
    // ---------------------------------

    const payload = {

        user_name: document
            .getElementById("username")
            .value
            .trim(),

        first_name: document
            .getElementById("firstName")
            .value
            .trim(),

        last_name: document
            .getElementById("lastName")
            .value
            .trim(),

        email: document
            .getElementById("email")
            .value
            .trim(),

        temporary_password: tempPassword
    };

    result.textContent =
        "Sending request to ServiceNow...";

    try {

        const basicAuth =
            btoa(apiUsername + ":" + apiPassword);

        const response = await fetch(
            instance + API_PATH,
            {
                method: "POST",

                mode: "cors",

                credentials: "omit",

                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": "Basic " + basicAuth
                },

                body: JSON.stringify(payload)
            }
        );

        const rawText = await response.text();

        let data;

        try {
            data = rawText
                ? JSON.parse(rawText)
                : {};
        }
        catch {
            data = {
                raw_response: rawText
            };
        }

        // ---------------------------------
        // HTTP errors
        // ---------------------------------

        if (!response.ok) {

            result.textContent =
                "ServiceNow returned HTTP " +
                response.status +
                " " +
                response.statusText +
                "\n\n" +
                JSON.stringify(data, null, 2);

            return;
        }

        // ---------------------------------
        // SUCCESS
        // ---------------------------------

        result.textContent =
            "Account created successfully!\n\n" +
            JSON.stringify(data, null, 2);

        // Don't leave passwords sitting in browser
        document.getElementById("apiPassword").value = "";
        document.getElementById("tempPassword").value = "";
        document.getElementById("confirmPassword").value = "";

    }
    catch (error) {

        result.textContent =
            "Connection failed before ServiceNow returned a response.\n\n" +
            error.message;
    }
});
