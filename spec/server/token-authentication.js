var shmock = require('shmock'),
    handlers = [],
    mock;

mock = shmock(parseInt(process.argv[2]));



handlers.push(
    mock.post('/api/tokens').send(
        {
            email: 'test@example.com',
            password: '123qwe'
        }
    ).reply(
        201,
        {
            token: '4d23c452a7ae11e4886b8c89a5640f47'
        }
    )
);

handlers.push(
    mock.post('/api/tokens').send(
        {
            email: 'nonExistingUser@example.com',
            password: 'none'
        }
    ).reply(
        400,
        {
            non_field_errors: ['Unable to log in with provided credentials.']
        }
    )
);

handlers.push(
    mock.get('/api/element').query(
        {
            id: 1
        }
    ).reply(
        403,
        {
            non_field_errors: ['Authorization required']
        }
    )
);

handlers.push(
    mock.post('/api/tokens').send(
        {
            email: 'test@example.com',
            password: '123qwe'
        }
    ).reply(
        201,
        {
            token: '7adb8920a7bd11e4bf808c89a5640f47'
        }
    )
);

handlers.push(
    mock.get('/api/element').query(
        {
            id: 1
        }
    ).set(
        'Authorization', 'Token 7adb8920a7bd11e4bf808c89a5640f47'
    ).reply(
        200,
        {
            id: 1,
            name: 'dummy element'
        }
    )
);

handlers.push(
    mock.post('/api/element').query().send(
        {
            name: 'new element'
        }
    ).reply(
        200,
        {
            id: 2,
            name: 'new element'
        }
    )
);

process.on('SIGINT', function() {
    var i,
        exit = true;

    for(i = 0; i < handlers.length; i += 1) {
        if(!handlers[i].isDone) {
            exit = false;
            break;
        }
    }

    if(exit) {
        mock.close();
    }
});
