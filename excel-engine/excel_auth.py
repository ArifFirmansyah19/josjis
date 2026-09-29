import msal
import os

CLIENT_ID = os.getenv("JOSJIS_MICROSOFT_CLIENT_ID")

AUTHORITY = "https://login.microsoftonline.com/organizations"

SCOPES = [
    "Files.ReadWrite",
]


def login():
    if not CLIENT_ID:
        raise RuntimeError(
            "JOSJIS_MICROSOFT_CLIENT_ID belum diatur."
        )

    app = msal.PublicClientApplication(
        CLIENT_ID,
        authority=AUTHORITY,
    )

    accounts = app.get_accounts()

    if accounts:
        result = app.acquire_token_silent(
            SCOPES,
            account=accounts[0],
        )

        if result and "access_token" in result:
            return result["access_token"]

    flow = app.initiate_device_flow(
        scopes=SCOPES
    )

    if "user_code" not in flow:
        raise RuntimeError(
            f"Gagal memulai login Microsoft: {flow}"
        )

    print()
    print("=== LOGIN MICROSOFT JOSJIS ===")
    print(flow["message"])
    print()

    result = app.acquire_token_by_device_flow(flow)

    if "access_token" not in result:
        raise RuntimeError(
            f"Login Microsoft gagal: {result}"
        )

    return result["access_token"]