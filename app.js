const form = document.getElementById("userForm");
const result = document.getElementById("result");

const API_PATH = "/api/2209290/account_provisioning_api/create";

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

    const payload = {
        user_name: document.getElementById("username").value.trim(),
        first_name: document.getElementById("firstName").value.trim(),
        last_name: document.getElementById("lastName").value.trim(),
        email: document.getElementById("email").value.trim()
    };

    const apiUrl = instance + API_PATH;

    result.textContent = "Sending request to ServiceNow...";

    try {
        // Credentials are used only for this request and are not written to storage.
        const basicAuth = btoa(apiUsername + ":" + apiPassword);

        const response = await fetch(apiUrl, {
            method: "POST",
            mode: "cors",
            credentials: "omit",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": "Basic " + basicAuth
            },
            body: JSON.stringify(payload)
        });

        const rawText = await response.text();
        let data;

        try {
            data = rawText ? JSON.parse(rawText) : {};
        } catch {
            data = { raw_response: rawText };
        }

        if (!response.ok) {
            if (response.status === 401) {
                result.textContent =
                    "ServiceNow returned 401 Unauthorized.\n\n" +
                    "The website reached the PDI, but ServiceNow rejected Basic Authentication.\n" +
                    "This is a ServiceNow account/authentication-policy issue, not a JavaScript or CORS error.\n\n" +
                    JSON.stringify(data, null, 2);
                return;
            }

            if (response.status === 403) {
                result.textContent =
                    "ServiceNow returned 403 Forbidden.\n\n" +
                    "Authentication succeeded, but this account does not have permission to perform the API operation.\n\n" +
                    JSON.stringify(data, null, 2);
                return;
            }

            result.textContent =
                `ServiceNow returned HTTP ${response.status} ${response.statusText}.\n\n` +
                JSON.stringify(data, null, 2);
            return;
        }

        result.textContent =
            "Account created successfully!\n\n" +
            JSON.stringify(data, null, 2);

        // Clear the password after a successful request.
        document.getElementById("apiPassword").value = "";

    } catch (error) {
        result.textContent =
            "Connection failed before ServiceNow returned an HTTP response.\n\n" +
            error.message +
            "\n\nCheck the PDI URL, CORS rule, network connection, and whether the PDI is awake.";
    }
});
