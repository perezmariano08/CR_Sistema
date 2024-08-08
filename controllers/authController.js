const bcryptjs = require('bcryptjs');
const jsonwebtoken = require('jsonwebtoken');
const db = require('../utils/db');
const mailer = require('../utils/mailer');
const { URL_FRONT } = require('../utils/utils');

const checkEmail = (req, res) => {
    const { email, bandera } = req.body;

    if (!email) {
        return res.status(400).send('Email no proporcionado');
    }

    db.query('SELECT COUNT(*) AS count FROM usuarios WHERE email = ?', [email], (err, result) => {
        if (err) {
            console.error('Error en la consulta a la base de datos:', err);
            return res.status(500).send('Error interno del servidor');
        }

        console.log('Resultado de la consulta:', result);

        if (!bandera) {
            // Si bandera es false, verifica si el email ya está registrado
            if (result.length > 0 && result[0].count > 0) {
                return res.status(400).send('El correo electrónico ya está registrado');
            } else {
                return res.status(200).send('El correo electrónico está disponible');
            }
        } else {
            // Si bandera es true, verifica si el email está registrado
            if (result.length > 0 && result[0].count > 0) {
                return res.status(200).send('El correo electrónico está registrado');
            } else {
                return res.status(400).send('Correo electrónico no encontrado en la base de datos');
            }
        }
    });
};

const checkDni = (req, res) => {
    const { dni } = req.body;
    db.query('SELECT COUNT(*) AS count FROM usuarios WHERE dni = ?', [dni], (err, result) => {
        if (err) return res.status(500).send('Error interno del servidor');
        if (result[0].count > 0) return res.status(400).send('El DNI ya está registrado');
        res.send('El DNI está disponible');
    });
};

const crearCuenta = (req, res) => {
    const { dni, nombre, apellido, fechaNacimiento, telefono, email, clave, equipoFav } = req.body;
    const fecha_creacion = new Date(); // Obtener la fecha actual

    db.query(`SELECT id_equipo FROM equipos WHERE id_equipo = '${equipoFav}'`, (err, rows) => {
        if (err) {
            console.error("Error al buscar el ID del equipo:", err);
            return res.status(500).send("Error interno del servidor");
        }

        if (rows.length === 0) {
            return res.status(400).send("El equipo proporcionado no existe");
        }

        const idEquipo = rows[0].id_equipo;

        bcryptjs.genSalt(10, (err, salt) => {
            if (err) {
                console.error("Error al generar la sal:", err);
                return res.status(500).send("Error interno del servidor");
            }

            bcryptjs.hash(clave, salt, (err, hash) => {
                if (err) {
                    console.error("Error al encriptar la contraseña:", err);
                    return res.status(500).send("Error interno del servidor");
                }

                db.query(`INSERT INTO usuarios(dni, nombre, apellido, nacimiento, telefono, email, id_rol, clave, id_equipo, fecha_creacion, fecha_actualizacion, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [dni, nombre, apellido, fechaNacimiento, telefono, email, 3, hash, idEquipo, fecha_creacion, null, 'I'],
                    async (err, result) => {
                        if (err) {
                            console.error("Error al insertar el usuario en la tabla usuarios:", err);
                            return res.status(500).send("Error interno del servidor");
                        }
                        
                        // Enviar el correo de verificación
                        if (email) {
                            try {
                                await mailer.sendVerificationEmail(email, dni, nombre);
                                res.status(200).send("Cuenta creada exitosamente. Revisa tu correo para activar la cuenta.");
                            } catch (error) {
                                console.error('Error al enviar el correo:', error);
                                res.status(500).json({ message: 'Hubo un error en el envío del mail de autenticación' });
                            }
                        } else {
                            res.status(200).send("Cuenta creada exitosamente.");
                        }
                    }
                );
            });
        });
    });
};

const checkLogin = (req, res) => {
    const { dni, password } = req.body;
    db.query('SELECT * FROM usuarios WHERE dni = ?', [dni], (err, rows) => {
        if (err) return res.status(500).send('Error interno del servidor');
        if (rows.length === 0) return res.status(401).send('Usuario no encontrado');

        const user = rows[0];
        if (user.estado !== 'A') return res.status(403).send('Cuenta no activada');

        if (!bcryptjs.compareSync(password, user.clave)) return res.status(401).send('Contraseña incorrecta');

        const token = jsonwebtoken.sign({ user: user.dni }, 'textosecretoDECIFRADO', { expiresIn: '1h' });
        res.status(200).json({ token, id_rol: user.id_rol });
    });
};

const logout = (req, res) => {
    res.send("Sesión cerrada exitosamente");
};

const checkAuthentication = (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) return res.status(401).send('Usuario no autenticado');

        const decoded = jsonwebtoken.verify(token, 'textosecretoDECIFRADO');
        db.query('SELECT * FROM usuarios WHERE dni = ?', [decoded.user], (err, result) => {
            if (err || result.length === 0) return res.status(401).send('Usuario no encontrado');
            
            const usuario = result[0];
            
            res.status(200).json({ message: "Usuario autenticado", usuario });
        });
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).send('Token expirado');
        }
        console.error('Controlador checkAuthentication - error:', error);
        return res.status(500).send('Error interno del servidor');
    }
};

const activarCuenta = (req, res) => {
    const { dni } = req.query;

    console.log(`DNI recibido: ${dni}`); // Log inicial para verificar el parámetro

    if (!dni) {
        console.log('Falta DNI');
        return res.status(400).send('Falta DNI');
    }

    db.query('UPDATE usuarios SET estado = ? WHERE dni = ?', ['A', dni], (err, result) => {
        if (err) {
            console.error('Error al actualizar el estado del usuario:', err);
            return res.status(500).send('Error interno del servidor');
        }

        console.log(`Resultado de la actualización: ${result.affectedRows}`); // Log para verificar la actualización

        if (result.affectedRows === 0) {
            console.log('El usuario no existe o ya está activado');
            return res.status(400).send('El usuario no existe o ya está activado');
        }

        console.log('Redirigiendo a login...'); // Log justo antes de la redirección
        res.redirect(`${URL_FRONT}/login?activada=true`);
    });
};

const forgotPasswordHandler = (req, res) => {
    const { email } = req.body;

    if (!email) {
        console.log('Falta email');
        return res.status(400).send('Falta Email');
    }

    try {
        db.query('SELECT dni, email FROM usuarios WHERE email = ?', [email], async (err, result) => {
            if (err) {
                console.error('Error al encontrar el email del usuario:', err);
                return res.status(500).send('Error interno del servidor');
            }

            if (result.length === 0) {
                return res.status(404).send('Email no encontrado');
            }

            const { dni, email: userEmail } = result[0];

            if (userEmail) {
                // Enviar el correo de recuperación
                await mailer.forgotPassword(userEmail, dni);
                return res.status(200).send("Mail de recuperación enviado con éxito");
            } else {
                return res.status(404).send("Cuenta no encontrada.");
            }
        });
    } catch (error) {
        console.error('Error al procesar la solicitud:', error);
        res.status(500).json({ message: 'Hubo un error en el envío del mail de recuperación' });
    }
};

const changeNewPassword = (req, res) => {
    const { clave, token } = req.body;

    if (!clave || !token) {
        return res.status(400).send("Clave y token son requeridos");
    }

    // Verificar el token
    jsonwebtoken.verify(token, 'your-secret-key', (err, decoded) => {
        if (err) {
            return res.status(400).send("Token inválido o expirado");
        }

        const { dni } = decoded;

        bcryptjs.genSalt(10, (err, salt) => {
            if (err) {
                console.error("Error al generar la sal:", err);
                return res.status(500).send("Error interno del servidor");
            }

            bcryptjs.hash(clave, salt, (err, hash) => {
                if (err) {
                    console.error("Error al encriptar la contraseña:", err);
                    return res.status(500).send("Error interno del servidor");
                }

                const query = 'UPDATE usuarios SET clave = ? WHERE dni = ?';
                db.query(query, [hash, dni], (err, results) => {
                    if (err) {
                        console.error("Error al actualizar la contraseña en la base de datos:", err);
                        return res.status(500).send("Error interno del servidor");
                    }

                    if (results.affectedRows === 0) {
                        return res.status(404).send("Usuario no encontrado");
                    }
                    res.status(200).send("Contraseña actualizada exitosamente");
                });
            });
        });
    });
};

module.exports = {
    checkEmail,
    checkDni,
    crearCuenta,
    checkLogin,
    logout,
    checkAuthentication,
    activarCuenta,
    forgotPasswordHandler,
    changeNewPassword
};
