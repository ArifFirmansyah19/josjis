export default function SpklStyles() {
  return (
    <style jsx global>{`
      .spkl-page {
        width: 1123px;
        height: 794px;
        min-height: 794px;
        box-sizing: border-box;
        position: relative;
        overflow: hidden;
        background: #ffffff;
        color: #111111;
        padding: 30px 40px 18px;
        font-family: Arial, Helvetica, sans-serif;
        font-size: 13px;
        line-height: 1.35;
      }
      .spkl-header {
        width: 100%;
        min-height: 110px;
        display: grid;
        grid-template-columns: 180px 1fr 180px;
        align-items: start;
      }
      .spkl-logo-area {
        display: flex;
        align-items: flex-start;
        justify-content: flex-start;
      }
      .spkl-logo {
        display: block;
        width: 210px;
        height: auto;
        max-height: 105px;
        object-fit: contain;
        object-position: left top;
      }
      .spkl-title-wrap {
        min-width: 0;
        padding-top: 55px;
        text-align: center;
      }
      .spkl-title-wrap h1 {
        margin: 0;
        font-size: 24px;
        line-height: 1.15;
        font-weight: 700;
        letter-spacing: 0.2px;
        white-space: nowrap;
      }
      .spkl-header-right {
        width: 100%;
      }
      .spkl-intro {
        margin: 11px 0 8px;
        font-size: 13.5px;
        line-height: 1.42;
        text-align: justify;
      }
      .spkl-date-info {
        margin-left: 27px;
        margin-bottom: 9px;
        display: grid;
        gap: 1px;
        font-size: 13px;
      }
      .spkl-date-info > div {
        display: grid;
        grid-template-columns: 112px 13px 1fr;
        align-items: baseline;
      }
      .spkl-date-info span:first-child {
        font-weight: 600;
      }
      .spkl-section-title {
        margin: 7px 0 5px;
        font-size: 14px;
        line-height: 1.2;
        font-weight: 700;
      }
      .spkl-supervisor-title {
        margin-top: 9px;
      }
      .spkl-table {
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
        font-size: 11.5px;
      }
      .spkl-table th,
      .spkl-table td {
        border: 1px solid #222222;
        padding: 5px 6px;
        vertical-align: middle;
        word-wrap: break-word;
        overflow-wrap: anywhere;
      }
      .spkl-table th {
        font-size: 10.5px;
        line-height: 1.18;
        font-weight: 700;
        text-align: center;
        background: #f7f7f7;
      }
      .spkl-table td {
        min-height: 36px;
      }
      .spkl-table-workers .col-no {
        width: 4%;
      }
      .spkl-table-workers .col-nip {
        width: 10%;
      }
      .spkl-table-workers .col-name {
        width: 13%;
      }
      .spkl-table-workers .col-position {
        width: 8%;
      }
      .spkl-table-workers .col-unit {
        width: 12%;
      }
      .spkl-table-workers .col-time {
        width: 11%;
      }
      .spkl-table-workers .col-work {
        width: 25%;
      }
      .spkl-table-workers .col-sign {
        width: 17%;
      }
      .spkl-table-supervisor .col-no {
        width: 4%;
      }
      .spkl-table-supervisor .col-nip {
        width: 12%;
      }
      .spkl-table-supervisor .col-name {
        width: 16%;
      }
      .spkl-table-supervisor .col-position {
        width: 12%;
      }
      .spkl-table-supervisor .col-unit {
        width: 15%;
      }
      .spkl-table-supervisor .col-sign {
        width: 17%;
      }
      .spkl-table-supervisor .col-note {
        width: 24%;
      }
      .signature-cell {
        height: 40px;
      }
      .supervisor-signature {
        height: 42px;
      }
      .spkl-note {
        margin-top: 5px;
        font-size: 10.5px;
        line-height: 1.25;
      }
      .spkl-approval {
        width: 285px;
        margin-left: auto;
        margin-top: 7px;
        text-align: center;
        font-size: 11.5px;
        line-height: 1.22;
      }
      .spkl-location {
        margin-bottom: 3px;
      }
      .spkl-knowing {
        margin-bottom: 2px;
        font-weight: 700;
      }
      .spkl-bank {
        font-weight: 700;
      }
      .spkl-branch {
        font-weight: 700;
      }
      .spkl-manager-sign {
        height: 27px;
      }
      .spkl-manager-name {
        font-weight: 700;
        text-decoration: underline;
      }
      .spkl-manager-position {
        margin-top: 1px;
      }
      .spkl-hidden-pdf-area {
        position: fixed;
        left: -20000px;
        top: 0;
        width: 1123px;
        background: #ffffff;
        z-index: -1;
      }
      .spkl-hidden-pdf-area .spkl-page {
        display: block !important;
        width: 1123px !important;
        height: 794px !important;
        min-height: 794px !important;
        transform: none !important;
        margin: 0 !important;
      }
      @media print {
        @page {
          size: A4 landscape;
          margin: 0;
        }
        html,
        body {
          width: 297mm;
          height: 210mm;
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }
        body * {
          visibility: hidden !important;
        }
        #spkl-pdf-area,
        #spkl-pdf-area * {
          visibility: visible !important;
        }
        #spkl-pdf-area {
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 1123px !important;
          z-index: 999999 !important;
        }
        #spkl-pdf-area .spkl-page {
          page-break-after: always;
          break-after: page;
          box-shadow: none !important;
        }
        #spkl-pdf-area .spkl-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
      }
    `}</style>
  );
}
