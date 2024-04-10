import { Outlet } from "react-router-dom";

import styles from "./ContentLayout.module.css";

function ContentLayout() {
  return (
    <div className={styles.content}>
      <Outlet />
    </div>
  );
}

export default ContentLayout;
