var shmock = require('shmock'),
    handlers = [],
    mock;

mock = shmock(parseInt(process.argv[2]));

// Login attempts
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

// Get element list (filtered)
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
        [
            {
                id: 1,
                name: 'dummy element'
            }
        ]
    )
);

// Create new element
handlers.push(
    mock.post('/api/element').query().send(
        {
            name: 'new element'
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
            token: 'ed155beea88311e4a85c8c89a5640f47'
        }
    )
);

handlers.push(
    mock.post('/api/element').query().set(
        'Authorization', 'Token ed155beea88311e4a85c8c89a5640f47'
    ).send(
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

// Update element
handlers.push(
    mock.put('/api/element/1').query().send(
        {
            id: 1,
            name: 'updated element'
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
            token: '04e5befaa88711e4a85c8c89a5640f47'
        }
    )
);

handlers.push(
    mock.put('/api/element/1').query().set(
        'Authorization', 'Token 04e5befaa88711e4a85c8c89a5640f47'
    ).send(
        {
            id: 1,
            name: 'updated element'
        }
    ).reply(
        200,
        {
            id: 1,
            name: 'updated element'
        }
    )
);


// Apply partial modification of element
handlers.push(
    mock.patch('/api/element/1').query().send(
        {
            name: 'changed element'
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
            token: '3dfc86f4a88411e4a85c8c89a5640f47'
        }
    )
);

handlers.push(
    mock.patch('/api/element/1').query().set(
        'Authorization', 'Token 3dfc86f4a88411e4a85c8c89a5640f47'
    ).send(
        {
            name: 'changed element'
        }
    ).reply(
        200,
        {
            id: 1,
            name: 'changed element'
        }
    )
);

// Delete element
handlers.push(
    mock.delete('/api/element/1').query().reply(
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
            token: 'cc771f08a88811e4a85c8c89a5640f47'
        }
    )
);

handlers.push(
    mock.delete('/api/element/1').query().set(
        'Authorization', 'Token cc771f08a88811e4a85c8c89a5640f47'
    ).reply(
        204,
        ''
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
