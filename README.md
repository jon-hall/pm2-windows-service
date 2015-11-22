# pm2-windows-service

Allows easily installing and uninstalling [PM2](https://github.com/Unitech/PM2/) as a service on Windows machines - inspired by [pm2-windows-startup](https://github.com/marklagendijk/node-pm2-windows-startup), and largely achieved using [node-windows](https://github.com/coreybutler/node-windows).

```sh
npm i pm2-windows-service -g
```

### Configuration
What the PM2 service runs is controlled using the following environment variables:
  - `PM2_SERVICE_SCRIPT` - Specifies a javascript file to run when the service starts (this is very basic, it just runs a single instance in fork mode, exactly as if you did `pm2 start %PM2_SERVICE_SCRIPT%` over the commandline).
  - `PM2_SERVICE_CONFIG` - Specifies a [json config file](http://pm2.keymetrics.io/docs/usage/application-declaration/) to run when the service starts (required for more complex launch scenarios, this takes precedence over `PM2_SERVICE_SCRIPT`).

If neither `PM2_SERVICE_SCRIPT` nor `PM2_SERVICE_CONFIG` are set, then the default behaviour is to call [`pm2 resurrect`](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#related-commands) on service startup - when pm2 is running with the list of processes you want launched by the service, use [`pm2 save`](http://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/#related-commands) to dump the process list, ready for the service to restore it when it starts.

### Install and Uninstall the Service
> TIP: Run these from an administrative command prompt to avoid getting hit with a bunch of UAC dialogs

```sh
pm2-service-install

pm2-service-uninstall
```
