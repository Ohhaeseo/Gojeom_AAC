package com.gojeom.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

/** created_at / updated_at 자동 관리. (ERD.md D-3) */
@Configuration
@EnableJpaAuditing
public class JpaConfig {
}
