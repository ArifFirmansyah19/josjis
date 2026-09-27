# ============================================================
# FILE
# D:\APLIKASI\josjis\excel-engine\server.py
# ============================================================

import base64
import json

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


HOST = "127.0.0.1"
PORT = 8765


# ============================================================
# HTTP HANDLER
# ============================================================

class Handler(BaseHTTPRequestHandler):

    def send_json(
        self,
        status_code,
        payload,
    ):
        body = json.dumps(
            payload,
            ensure_ascii=False,
            default=str,
        ).encode("utf-8")

        self.send_response(
            status_code
        )

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

    # ========================================================
    # OPTIONS
    # ========================================================

    def do_OPTIONS(self):
        self.send_json(
            200,
            {
                "success": True
            },
        )

    # ========================================================
    # READ REQUEST
    # ========================================================

    def read_request(self):
        content_length = int(
            self.headers.get(
                "Content-Length",
                "0",
            )
        )

        body = self.rfile.read(
            content_length
        )

        return json.loads(
            body.decode("utf-8")
        )

    # ========================================================
    # DECODE EXCEL
    # ========================================================

    def decode_excel_request(
        self,
        request,
    ):
        file_name = request.get(
            "fileName",
            "RaportMU.xlsb",
        )

        # Frontend lama:
        # "file"
        #
        # Frontend baru:
        # "fileBase64"
        encoded_file = (
            request.get("file")
            or request.get("fileBase64")
        )

        if not encoded_file:
            raise Exception(
                "File Excel tidak dikirim."
            )

        file_bytes = base64.b64decode(
            encoded_file
        )

        return (
            file_bytes,
            file_name,
        )

    # ========================================================
    # POST
    # ========================================================

    def do_POST(self):
        try:
            request = self.read_request()

            # =================================================
            # 2A / PORT UNIT
            # =================================================

            if (
                self.path
                == "/raportmu/port-unit"
            ):
                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(
                    request
                )

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

            # =================================================
            # EASY CALL
            # =================================================

            if (
                self.path
                == "/raportmu/easy-call"
            ):
                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(
                    request
                )

                result = process_easy_call(
                    file_bytes=file_bytes,
                    file_name=file_name,
                )

                self.send_json(
                    200,
                    result,
                )

                return

            # =================================================
            # BOOKING OPTIONS
            # =================================================

            if (
                self.path
                == "/raportmu/booking/options"
            ):
                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(
                    request
                )

                result = process_booking_options(
                    file_bytes=file_bytes,
                    file_name=file_name,
                )

                self.send_json(
                    200,
                    result,
                )

                return

            # =================================================
            # BOOKING PROCESS
            # =================================================

            if (
                self.path
                == "/raportmu/booking/process"
            ):
                (
                    file_bytes,
                    file_name,
                ) = self.decode_excel_request(
                    request
                )

                branch = str(
                    request.get(
                        "branch",
                        "",
                    )
                    or ""
                ).strip()

                name = str(
                    request.get(
                        "name",
                        "",
                    )
                    or ""
                ).strip()

                if not branch:
                    raise Exception(
                        "Cabang Booking belum dipilih."
                    )

                if not name:
                    raise Exception(
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

            # =================================================
            # HEALTH
            # =================================================

            if self.path == "/health":
                self.send_json(
                    200,
                    {
                        "success": True,
                        "service": (
                            "josjis-excel-engine"
                        ),
                    },
                )

                return

            # =================================================
            # 404
            # =================================================

            self.send_json(
                404,
                {
                    "success": False,
                    "error": (
                        "Endpoint tidak ditemukan."
                    ),
                },
            )

        except Exception as error:
            print("")
            print(
                "========================================"
            )
            print(
                "ERROR EXCEL ENGINE"
            )
            print(
                "========================================"
            )
            print(error)
            print("")

            self.send_json(
                500,
                {
                    "success": False,
                    "error": str(error),
                },
            )


# ============================================================
# MAIN
# ============================================================

def main():
    server = ThreadingHTTPServer(
        (HOST, PORT),
        Handler,
    )

    print("")
    print(
        "========================================"
    )
    print(
        "JOSJIS EXCEL ENGINE"
    )
    print(
        "========================================"
    )

    print(
        f"Server: http://{HOST}:{PORT}"
    )

    print("")

    print(
        "Endpoint 2A:"
    )

    print(
        f"http://{HOST}:{PORT}"
        "/raportmu/port-unit"
    )

    print("")

    print(
        "Endpoint Easy Call:"
    )

    print(
        f"http://{HOST}:{PORT}"
        "/raportmu/easy-call"
    )

    print("")

    print(
        "Endpoint Booking Options:"
    )

    print(
        f"http://{HOST}:{PORT}"
        "/raportmu/booking/options"
    )

    print("")

    print(
        "Endpoint Booking Process:"
    )

    print(
        f"http://{HOST}:{PORT}"
        "/raportmu/booking/process"
    )

    print("")

    print(
        "Endpoint Health:"
    )

    print(
        f"http://{HOST}:{PORT}"
        "/health"
    )

    print("")

    print(
        "Engine siap menerima request dari JOSJIS."
    )

    print(
        "Tekan CTRL+C untuk menghentikan."
    )

    print("")

    try:
        server.serve_forever()

    except KeyboardInterrupt:
        print(
            "Excel Engine dihentikan."
        )

    finally:
        server.server_close()


if __name__ == "__main__":
    main()