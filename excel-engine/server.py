
import base64
import json
import traceback

from http.server import (
    BaseHTTPRequestHandler,
    ThreadingHTTPServer,
)

from engine_2a_easycall import (
    process_excel,
    process_easy_call,
)

from engine_booking import (
    process_booking,
    process_booking_options,
)

from engine_advis import process_advis


HOST = "127.0.0.1"
PORT = 8765

class Handler(BaseHTTPRequestHandler):

    def send_json(self, status_code, payload):
        body = json.dumps(
            payload,
            ensure_ascii=False,
            default=str,
        ).encode("utf-8")

        self.send_response(status_code)

        self.send_header(
            "Content-Type",
            "application/json; charset=utf-8",
        )

        self.send_header(
            "Access-Control-Allow-Origin",
            "*",
        )

        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type",
        )

        self.send_header(
            "Access-Control-Allow-Methods",
            "POST, OPTIONS",
        )

        self.send_header(
            "Content-Length",
            str(len(body)),
        )

        self.end_headers()
        self.wfile.write(body)
    def do_OPTIONS(self):
        self.send_json(
            200,
            {
                "success": True,
            },
        )

    def read_request(self):
        content_length = int(
            self.headers.get(
                "Content-Length",
                "0",
            )
        )

        if content_length <= 0:
            raise ValueError(
                "Request body kosong."
            )

        body = self.rfile.read(content_length)

        return json.loads(
            body.decode("utf-8")
        )

    def decode_excel_request(self, request):
        file_name = request.get(
            "fileName",
            "RaportMU.xlsb",
        )

        # Mendukung frontend lama dan baru.
        encoded_file = (
            request.get("file")
            or request.get("fileBase64")
        )

        if not encoded_file:
            raise ValueError(
                "File Excel tidak dikirim."
            )

        try:
            file_bytes = base64.b64decode(
                encoded_file,
                validate=True,
            )
        except Exception as error:
            raise ValueError(
                "Format file Excel Base64 tidak valid."
            ) from error

        if not file_bytes:
            raise ValueError(
                "File Excel kosong."
            )

        return file_bytes, file_name

    def do_POST(self):
        try:
            request = self.read_request()

            if self.path == "/raportmu/advis":

                data = request.get("data", [])

                if not isinstance(data, list):
                    raise ValueError(
                        "Data Advis harus berupa array."
                    )

                if not data:
                    raise ValueError(
                        "Tidak ada data untuk membuat Advis."
                    )

                result = process_advis(data)

                self.send_json(
                    200,
                    result,
                )

                return

 
            if self.path == "/raportmu/port-unit":

                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(request)

                unit_name = request.get(
                    "unit",
                    "Jambi Kuamang Kuning 1",
                )

                result = process_excel(
                    file_bytes=file_bytes,
                    file_name=file_name,
                    unit_name=unit_name,
                )

                self.send_json(
                    200,
                    result,
                )

                return
            if self.path == "/raportmu/easy-call":

                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(request)

                result = process_easy_call(
                    file_bytes=file_bytes,
                    file_name=file_name,
                )

                self.send_json(
                    200,
                    result,
                )

                return

            if self.path == "/raportmu/booking/options":

                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(request)

                result = process_booking_options(
                    file_bytes=file_bytes,
                    file_name=file_name,
                )

                self.send_json(
                    200,
                    result,
                )

                return

            if self.path == "/raportmu/booking/process":

                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(request)

                branch = str(
                    request.get("branch", "") or ""
                ).strip()

                name = str(
                    request.get("name", "") or ""
                ).strip()

                if not branch:
                    raise ValueError(
                        "Cabang Booking belum dipilih."
                    )

                if not name:
                    raise ValueError(
                        "Nama SGP belum dipilih."
                    )

                result = process_booking(
                    file_bytes=file_bytes,
                    file_name=file_name,
                    branch=branch,
                    name=name,
                )

                self.send_json(
                    200,
                    result,
                )

                return


            if self.path == "/health":

                self.send_json(
                    200,
                    {
                        "success": True,
                        "service": "josjis-excel-engine",
                    },
                )

                return


            self.send_json(
                404,
                {
                    "success": False,
                    "error": "Endpoint tidak ditemukan.",
                },
            )

        except Exception as error:

            print()
            print("=" * 60)
            print("ERROR EXCEL ENGINE")
            print("=" * 60)
            print(f"Endpoint: {self.path}")
            print(f"Error: {error}")
            traceback.print_exc()
            print("=" * 60)
            print()

            try:
                self.send_json(
                    500,
                    {
                        "success": False,
                        "error": str(error),
                    },
                )
            except Exception:
                pass


    def log_message(self, format_string, *args):
        print(
            "[%s] %s"
            % (
                self.log_date_time_string(),
                format_string % args,
            )
        )


def main():

    server = ThreadingHTTPServer(
        (HOST, PORT),
        Handler,
    )

    print()
    print("=" * 60)
    print("JOSJIS EXCEL ENGINE")
    print("=" * 60)

    print(f"Server: http://{HOST}:{PORT}")
    print()

    endpoints = [
        "/raportmu/port-unit",
        "/raportmu/easy-call",
        "/raportmu/advis",
        "/raportmu/booking/options",
        "/raportmu/booking/process",
        "/health",
    ]

    print("Endpoint tersedia:")

    for endpoint in endpoints:
        print(f"  http://{HOST}:{PORT}{endpoint}")

    print()
    print("Engine siap menerima request dari JOSJIS.")
    print("Tekan CTRL+C untuk menghentikan.")
    print()

    try:
        server.serve_forever()

    except KeyboardInterrupt:
        print()
        print("Excel Engine dihentikan.")

    finally:
        server.server_close()


if __name__ == "__main__":
    main()
