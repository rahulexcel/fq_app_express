module.exports = function () {
    var nodemailer = require('nodemailer');
    var hbs = require('nodemailer-express-handlebars');
    var options = {
        viewEngine: {
            extname: '.hbs',
            layoutsDir: 'views/email/',
            defaultLayout: 'template',
            partialsDir: 'views/partials/'
        },
        viewPath: 'views/email/',
        extName: '.hbs'
    };
    var smtpTransport = require('nodemailer-smtp-transport');
    var mailerObj = {
        send: function (to, subject, template, context) {
            //---added by arun on 1st may 2015
            var mandrill = require('mandrill-api/mandrill');
            var mandrill_client = new mandrill.Mandrill('Ca4nS3QStEcpvZdk9iMh0Q'); 
            var message = {
                "html": context.body,
                "subject": subject,
                "from_email": "noreply@fashioniq.in",
                "from_name": "Fashioniq.in",
                "to": [{
                        "email": to,
                        "name": to
                    }],
            };
            mandrill_client.messages.send({"message": message}, function(result) {
                console.log(result);
            }, function(e) {
                console.log('A mandrill error occurred: ' + e.name + ' - ' + e.message);
            });
           
        }
    };
    return function (req, res, next) {
        req.mailer = mailerObj;
        next();
    }
}
