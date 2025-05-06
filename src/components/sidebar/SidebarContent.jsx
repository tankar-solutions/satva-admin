import React, { useContext } from "react";
import { NavLink, Route } from "react-router-dom";
import Cookies from "js-cookie";
import { useTranslation } from "react-i18next";
import { Button, WindmillContext } from "@windmill/react-ui";
import { IoLogOutOutline } from "react-icons/io5";

// internal imports
import sidebar from "@/routes/sidebar";
import SidebarSubMenu from "@/components/sidebar/SidebarSubMenu";
import { AdminContext } from "@/context/AdminContext";
import useGetCData from "@/hooks/useGetCData";

// ✅ Single PNG logo
import logo from "@/assets/img/logo/logo.png";

const SidebarContent = () => {
  const { t } = useTranslation();
  const { dispatch } = useContext(AdminContext);
  const { accessList } = useGetCData();

  const handleLogOut = () => {
    dispatch({ type: "USER_LOGOUT" });
    Cookies.remove("adminInfo");
  };

  const updatedSidebar = sidebar
    .map((route) => {
      if (route.routes) {
        const validSubRoutes = route.routes.filter((subRoute) => {
          const routeKey = subRoute.path.split("?")[0].split("/")[1];
          return accessList.includes(routeKey);
        });

        if (validSubRoutes.length > 0) {
          return { ...route, routes: validSubRoutes };
        }
        return null;
      }
      const routeKey = route.path?.split("?")[0].split("/")[1];
      return routeKey && accessList.includes(routeKey) ? route : null;
    })
    .filter(Boolean);

  return (
    <div className="-mt-20 text-gray-500  py-4 dark:text-gray-400">
      <a className="text-gray-900 dark:text-gray-200" href="/dashboard">
      <img
        src={logo}
        alt="Logo"
         className=" w-135 h-auto" 
        />
      </a>
      <ul className="-mt-10">
        {updatedSidebar?.map((route) =>
          route.routes ? (
            <SidebarSubMenu route={route} key={route.name} />
          ) : (
            <li className="relative" key={route.name}>
              <NavLink
                exact
                to={route.path}
                target={`${route?.outside ? "_blank" : "_self"}`}
                className="px-6 py-4 inline-flex items-center w-full text-sm font-semibold transition-colors duration-150 hover:text-emerald-700 dark:hover:text-gray-200"
                activeStyle={{ color: "#0d9e6d" }}
                rel="noreferrer"
              >
                <Route path={route.path} exact={route.exact}>
                  <span
                    className="absolute inset-y-0 left-0 w-1 bg-emerald-500 rounded-tr-lg rounded-br-lg"
                    aria-hidden="true"
                  ></span>
                </Route>
                <route.icon className="w-5 h-5" aria-hidden="true" />
                <span className="ml-4">{t(`${route.name}`)}</span>
              </NavLink>
            </li>
          )
        )}
      </ul>
      <span className="lg:fixed bottom-0 px-6 py-6 w-64 mx-auto relative mt-3 block">
        <Button onClick={handleLogOut} size="large" className="w-full">
          <span className="flex items-center">
            <IoLogOutOutline className="mr-3 text-lg" />
            <span className="text-sm">{t("LogOut")}</span>
          </span>
        </Button>
      </span>
    </div>
  );
};

export default SidebarContent;
