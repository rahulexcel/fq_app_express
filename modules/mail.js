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
            var mailer = nodemailer.createTransport(smtpTransport({
//                host: 'smtp.mandrillapp.com',
//                port: 587,
//                auth: {
//                    user: 'manish@excellencetechnologies.in',
//                    pass: 'Ca4nS3QStEcpvZdk9iMh0Q'
//                }

                host: 'smtp.sendgrid.net',
                port: 587,
                auth: {
                    user: 'manish_iitg',
                    pass: 'java@123'
                }

            }));
            mailer.use('compile', hbs(options));
            mailer.sendMail({
                from: 'noreply@fashioniq.in',
                to: to,
                subject: subject,
                template: template,
                context: context
            }, function (error, response) {
                if( error ){
                    console.log(error);
                }
                console.log('mail sent to ' + to);
                mailer.close();
            });
        }
    };
    return function (req, res, next) {
        req.mailer = mailerObj;
        next();
    }
}