# pm2-windows-service

Allows easily installing and uninstalling [PM2](https://github.com/Unitech/PM2/) as a service on Windows machines - inspired by [pm2-windows-startup](https://github.com/marklagendijk/node-pm2-windows-startup), and largely achieved using [node-windows](https://github.com/coreybutler/node-windows).

```sh
npm i pm2-windows-service -g
```

### **Caveats**
While testing this a few caveats have arisen which need to be detailed upfront, as they might well lead to issues, or even be blockers to you using this package:
  - If you run the service under one user account, and then attempt to interact with PM2 from the command line using a different account, you'll find things don't work as expected if the `PM2_HOME` environment variable contains any ["user context" env vars](https://technet.microsoft.com/en-us/library/cc749104.aspx#BKMK_2) (`%APPDATA%`, `%USERPROFILE%` etc.), or if one of the users cannot access the location of `PM2_HOME`.
    - To avoid this problem, either ***set `PM2_HOME` to an absolute path that all potential users (service and CLI) can write to***, *or* ***run the service under the same account as you intend to use the CLI from***.
  - It also seems PM2 throws an error when you try to use the CLI from a *non-administrative command prompt* when it has been launched as a service, regardless of which user the service runs under (not tested with a non-admin user, yet).
    - Currently, the workaround for this is, unfortunately, just ***use an administrative command prompt*** if you need to access PM2 via command line when it is running as a service.

### Configuration
What the PM2 service runs is controlled using the following environment variables:
  - `PM2_SERVICE_SCRIPT` - Specifies a javascript file to run when the service starts (this is very basic, it just runs a single instance in fork mode, exactly as if you did `pm2 start %PM2_SERVICE_SCRIPT%` over the command line).
  - `PM2_SERVICE_CONFIG` - Specifies a [json config file](http://pm2.keymetrics.io/docs/usage/application-declaration/) to run when the service starts (required for more complex launch scenarios, this takes precedence over `PM2_SERVICE_SCRIPT`).

If neither `PM2_SERVICE_SCRIPT` nor `PM2_SERVICE_CONFIG` are set, then the default behaviour is to call [`pm2 resurrect`](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#related-commands) on service startup - when pm2 is running with the list of processes you want launched by the service, use [`pm2 save`](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#related-commands) to dump the process list, ready for the service to restore it when it starts.

### Install and Uninstall the Service
> TIP: Run these from an administrative command prompt to avoid getting hit with a bunch of UAC dialogs

```sh
pm2-service-install

pm2-service-uninstall
```
