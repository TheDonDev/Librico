<div align="center">
  <br />
  <h1>Librico</h1>
  <p>
    A standalone desktop application using Electron and React to replace manual, paper-based systems in high school libraries.
  </p>
</div>

---

## Key Features

*   **Secure Librarian Authentication**: Email verification and password-protected access for librarians.
*   **Book Inventory Management**: Easily add, view, and manage the library's book collection.
*   **Borrowing & Returning System**: A simple interface to manage borrowing records for each book.
*   **Due Date Tracking**: Automatically calculates and displays due dates for borrowed books.
*   **Cross-Platform**: Packaged for Windows, macOS, and Linux.

## Screenshots


| Login Screen | Main Dashboard |
| :---: | :---: |
| ![Login](https://via.placeholder.com/400x300.png?text=Login+Screen) | ![Dashboard](https://via.placeholder.com/400x300.png?text=Main+Dashboard) |

## How to Download and Install

You can download the latest version of Librico for your operating system from the **[Releases](https://github.com/TheDonDev/librico/releases)** page.

### For Windows

1.  Download the `Librico-Setup-x.x.x.exe` file.
2.  Run the installer. Windows Defender might show a warning because the app is not code-signed. Click "More info" and then "Run anyway".
3.  Follow the on-screen instructions to install the application.

### For macOS

1.  Download the `Librico-x.x.x.dmg` file.
2.  Open the `.dmg` file.
3.  Drag the Librico application icon into your "Applications" folder.
4.  The first time you open it, you may need to right-click the app and select "Open" due to Apple's security policies for unsigned applications.

## Tech Stack

*   **Framework**: Electron
*   **Frontend**: React with Vite
*   **Database**: SQLite3 with Knex.js query builder
*   **Styling**: Plain CSS

## Development Setup

To run this project locally for development:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/TheDonDev/librico.git
    cd librico
    ```

2.  **Install dependencies:**
    This project uses npm workspaces. Running `npm install` from the root directory will install dependencies for both the root and the `renderer` workspace.
    ```bash
    npm install
    ```

3.  **Run the development server:**
    This command concurrently starts the Vite dev server for the React app and the Electron main process.
    ```bash
    npm run dev
    ```

## Building the Application

To package the application for your current operating system, run the following command. The distributable files will be located in the `dist` folder.

```bash
npm run package
```

## License

The source code for this project is licensed under the ISC License, which you can find in the `LICENSE` file.

Please note that while the code is open-source, a commercial license is required for institutional or business use. For details on commercial licensing, support plans, and custom feature development, please contact us.

---

> GitHub @TheDonDev &nbsp;&middot;&nbsp;
> Email donaldmwanga33@gmail.com
